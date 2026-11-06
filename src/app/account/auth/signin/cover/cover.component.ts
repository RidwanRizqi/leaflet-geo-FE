import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { firstValueFrom, take } from 'rxjs';
import { AuthenticationService } from 'src/app/services/auth.service';
import { RoleMenuService } from 'src/app/services/role-menu.service';
import { LanguageService } from 'src/app/services/language.service';
import { ToastService } from 'src/app/shared/services/toast-service';
import { Store } from '@ngrx/store';
import { setUser, setMenuPermissions } from 'src/app/store/auth/auth.action';
import { selectCurrentUser } from 'src/app/store/auth/auth.selector';
import { ApiResponse, LoginResponse } from 'src/app/models/auth.models';

@Component({
  selector: 'app-cover',
  templateUrl: './cover.component.html',
  styleUrls: ['./cover.component.scss']
})

/**
 * Cover Component - Login Page
 */
export class CoverComponent implements OnInit {

  // Login Form
  loginForm!: UntypedFormGroup;
  submitted = false;
  fieldTextType!: boolean;
  error = '';
  returnUrl!: string;
  // set the current year
  year: number = new Date().getFullYear();
  // Carousel navigation arrow show
  showNavigationArrows: any;
  userData!: any;
  alertType: 'success' | 'danger' | null = null;
  alertMessage: string | null = null;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private authenticationService: AuthenticationService,
    private roleMenuService: RoleMenuService,
    private router: Router,
    private route: ActivatedRoute,
    public toastService: ToastService,
    public translate: TranslateService,
    public languageService: LanguageService,
    private spinner: NgxSpinnerService,
    private store: Store
  ) {
    this.translate.setDefaultLang('en');
  }

  async ngOnInit(): Promise<void> {
    // Check if already logged in
    this.store.select(selectCurrentUser)
      .pipe(take(1))
      .subscribe(user => {
        this.userData = user;
        if (this.userData) {
          if (this.userData.role?.toUpperCase() === 'MAGANG') {
            this.router.navigate(['/absensi']);
          } else {
            this.router.navigate(['/']);
          }
        }
      });

    // Form Validation - changed employeeCode to username
    this.loginForm = this.formBuilder.group({
      username: [null, [Validators.required]],
      password: [null, [Validators.required]],
    });

    // get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  // convenience getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  /**
   * Form submit - Login
   */
  async onSubmit() {
    try {
      this.submitted = true;

      // Validate input fields
      if (!this.f['username'].value || !this.f['password'].value) {
        return;
      }

      this.spinner.show();

      // Perform Login using new backend endpoint
      const response: ApiResponse<LoginResponse> = await firstValueFrom(
        this.authenticationService.login(
          this.f['username'].value,
          this.f['password'].value
        )
      );

      console.log('Login response:', response);

      if (response.success && response.data) {
        // Store the token in localStorage
        this.authenticationService.storeToken(response.data.token);

        // Set user data in store
        this.store.dispatch(setUser({
          user: {
            nama: response.data.nama,
            role: response.data.role,
            idUnit: response.data.idUnit,
            token: response.data.token
          }
        }));

        // Fetch and store menu permissions immediately
        let userMenuIds: number[] | null = null;
        try {
          userMenuIds = await firstValueFrom(this.roleMenuService.getMyPermissions());
          this.store.dispatch(setMenuPermissions({ menuIds: userMenuIds ?? null }));
        } catch (permErr) {
          console.warn('Could not load menu permissions on login:', permErr);
          this.store.dispatch(setMenuPermissions({ menuIds: [] }));
        }

        this.alertType = 'success';
        this.alertMessage = response.message || 'Login berhasil';

        this.spinner.hide();

        const roleRoutes: Record<string, string> = {
          'ADMIN': '/dashboard-pajak',
          'EKSEKUTIF': '/dashboard-pajak',
          'GIS': '/bidang/map',
          'PBJT-HOTEL': '/pbjt-hotel/assessment-list',
          'PBJT-MAMIN': '/pbjt-makanan',
          'MAGANG': '/absensi',
        };
        const role = response.data.role?.toUpperCase() || '';
        let target = '/';

        if (role === 'MAGANG') {
          target = '/absensi';
        } else if (userMenuIds !== null && !userMenuIds.includes(7)) {
          // User does not have access to dashboard-pajak
          if (userMenuIds.includes(12) || userMenuIds.includes(121)) {
            target = '/absensi';
          } else {
            target = '/';
          }
        } else {
          const defaultRoute = roleRoutes[role] || '/';
          target = this.returnUrl && this.returnUrl !== '/' ? this.returnUrl : defaultRoute;
          // If returnUrl was /dashboard-pajak but user lacks access to 7
          if (target === '/dashboard-pajak' && userMenuIds !== null && !userMenuIds.includes(7)) {
            target = userMenuIds.includes(12) || userMenuIds.includes(121) ? '/absensi' : '/';
          }
        }
        
        const navSuccess = await this.router.navigate([target]);
        if (!navSuccess) {
          // Jika target awal ditolak AuthGuard, fallback ke /absensi atau landing utama
          const fallback = (userMenuIds && (userMenuIds.includes(12) || userMenuIds.includes(121))) ? '/absensi' : '/';
          const retrySuccess = await this.router.navigate([fallback]);
          if (!retrySuccess) {
            this.error = 'Akses ditolak: Anda belum diberikan akses ke menu utama. Silakan hubungi Admin.';
            this.alertType = 'danger';
            this.alertMessage = this.error;
            this.toastService.show(this.error, { classname: 'bg-danger text-white', delay: 5000 });
            this.authenticationService.clearToken();
            this.store.dispatch(setUser({ user: null }));
          }
        }
      } else {
        // Login failed
        this.error = response.message || 'Login gagal';
        this.alertType = 'danger';
        this.alertMessage = this.error;
        this.spinner.hide();
        this.toastService.show(this.error, { classname: 'bg-danger text-white', delay: 5000 });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      this.error = error.error?.message || 'Login gagal. Silakan coba lagi.';
      this.alertType = 'danger';
      this.alertMessage = this.error;
      this.spinner.hide();
      this.toastService.show(this.error, { classname: 'bg-danger text-white', delay: 5000 });
    }
  }

  /**
   * Password Hide/Show
   */
  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

}
