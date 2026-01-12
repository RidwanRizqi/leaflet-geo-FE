import { Component, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { firstValueFrom, take } from 'rxjs';
import { AuthenticationService } from 'src/app/services/auth.service';
import { LanguageService } from 'src/app/services/language.service';
import { ToastService } from 'src/app/shared/services/toast-service';
import { Store } from '@ngrx/store';
import { setUser } from 'src/app/store/auth/auth.action';
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
          this.router.navigate(['/']);
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

        this.alertType = 'success';
        this.alertMessage = response.message || 'Login berhasil';

        this.spinner.hide();
        await this.router.navigate([this.returnUrl || '/']);
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
