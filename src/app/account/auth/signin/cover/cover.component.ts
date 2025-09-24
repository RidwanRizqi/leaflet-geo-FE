import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { firstValueFrom, take } from 'rxjs';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { CsrfService } from 'src/app/core/services/csrf.service';
import { LanguageService } from 'src/app/core/services/language.service';
import { ToastService } from 'src/app/shared/services/toast-service';
import { RestApiService } from 'src/app/core/services/rest-api.service';
import { Store } from '@ngrx/store';
import { setUser } from 'src/app/store/auth/auth.action';
import { selectCurrentUser } from 'src/app/store/auth/auth.selector';

@Component({
  selector: 'app-cover',
  templateUrl: './cover.component.html',
  styleUrls: ['./cover.component.scss']
})

/**
 * Cover Component
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
    @Inject(CsrfService) public toastService: ToastService, 
    @Inject(CsrfService) private csrfService: CsrfService, 
    public translate: TranslateService, 
    public languageService: LanguageService, 
    private spinner: NgxSpinnerService,
    private restApiService: RestApiService,
    private store: Store
  ) { 
    this.translate.setDefaultLang('en');
  }

  async ngOnInit(): Promise<void> {
    this.store.select(selectCurrentUser)
    .pipe(take(1))
    .subscribe(user => {
      this.userData = user;
      console.log(this.userData);
  
      if (this.userData) {
        this.router.navigate(['/']);
      }
    });
  

    // Form Validation
    this.loginForm = this.formBuilder.group({
      employeeCode: [null, [Validators.required]],
      password: [null, [Validators.required]],
    });
    
    // get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/application-list';
  }

  // convenience getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  /**
   * Form submit
   */
   async onSubmit() {
    try {
      this.submitted = true;
  
      // Validate input fields
      if (!this.f['employeeCode'].value || !this.f['password'].value) {
        // Display an error message or handle validation as needed
        return;
      }
  
      this.spinner.show();
      // this.toastService.show('Logging in...', { classname: 'bg-primary text-center text-white', delay: 50000 });
      // Fetch CSRF Token
      await firstValueFrom(this.csrfService.getCsrfToken());
  
      // Perform Login
      const data: any = await firstValueFrom(
        this.authenticationService.login(
          this.f['employeeCode'].value,
          this.f['password'].value
        )
      );
  
      console.log(data);
      
      if (!data.error) {
        // Set the user data
        const userData: any = await firstValueFrom(this.restApiService.getLoggedInUser());
        // this.tokenStorageService.setUser(userData.data);
        // this.storeService.setUser(userData.data);
        this.store.dispatch(setUser({ user: userData.data }));
        this.alertType = 'success';
        this.alertMessage = this.translate.instant('APPPAGE.LOGIN.SUCCESSMSG.LOGIN');
        
        this.spinner.hide();
        await this.router.navigate([this.returnUrl || '']);
        // location.reload();
      } else {
        this.error = data.message || this.translate.instant('APPPAGE.LOGIN.ERRORMSG.DEFAULT');
        this.alertType = 'danger';
        this.alertMessage = this.error;
        this.spinner.hide();
        this.toastService.show(data.message, { classname: 'bg-danger text-white', delay: 15000 });
      }
    } catch (error: any) {
      console.error(error);
      this.error = error.status === 404 
        ? this.translate.instant('APPPAGE.LOGIN.ERRORMSG.INVALIDUSER') 
        : error.status === 403 
        ? this.translate.instant('APPPAGE.LOGIN.ERRORMSG.INVALIDROLE') 
        : this.translate.instant('APPPAGE.LOGIN.ERRORMSG.DEFAULT');
      this.alertType = 'danger';
      this.alertMessage = this.error;
      this.spinner.hide();
    }
  }

  /**
   * Password Hide/Show
   */
   toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

}
