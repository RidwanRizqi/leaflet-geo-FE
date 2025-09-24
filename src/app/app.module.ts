import { APP_INITIALIZER, CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NgPipesModule } from 'ngx-pipes';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LayoutsModule } from './layouts/layouts.module';
import { PagesModule } from './pages/pages.module';
import {
  HttpClient,
  HTTP_INTERCEPTORS,
  provideHttpClient,
  withInterceptorsFromDi,
  withXsrfConfiguration,
} from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { environment } from '../environments/environment';

// Interceptor
import { HttpInterceptorService } from './core/helpers/http.interceptor';
import { ErrorInterceptor } from './core/helpers/error.interceptor';

// Language
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';

// Store
import { Store, StoreModule } from '@ngrx/store';
import { rootReducer } from './store';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { EffectsModule } from '@ngrx/effects';

import { NgxSpinnerModule } from 'ngx-spinner';
import { fetchUserInitializer } from './core/factories/fetch-user.factory'
import { Router } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RestApiService } from './core/services/rest-api.service';
import { SharedModule } from './shared/shared.module';

// New Translation Initializer
export function translationInitializer(translate: TranslateService) {
  return () => new Promise<void>((resolve) => {
    translate.setDefaultLang('en');
    translate.use('en').subscribe(() => {
      console.log('Translations loaded!');
      resolve();
    });
  });
}

export function createTranslateLoader(http: HttpClient): any {
  return new TranslateHttpLoader(http, 'assets/i18n/', '.json');
}

@NgModule({
  declarations: [AppComponent],
  bootstrap: [AppComponent],
  imports: [
    TranslateModule.forRoot({
      defaultLanguage: 'en',
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient],
      },
    }),
    BrowserAnimationsModule,
    BrowserModule,
    AppRoutingModule,
    LayoutsModule,
    PagesModule,
    SharedModule,
    NgPipesModule,
    StoreModule.forRoot(rootReducer),
    StoreDevtoolsModule.instrument({
      maxAge: 25, // Retains last 25 states
      logOnly: environment.production, // Restrict extension to log-only mode
    }),
    EffectsModule.forRoot(),
    NgxSpinnerModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [
    DecimalPipe,
    DatePipe,
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: HttpInterceptorService, multi: true },
    {
      provide: APP_INITIALIZER,
      useFactory: translationInitializer,
      deps: [TranslateService],
      multi: true, // Add translation initializer
    },
    {
      provide: APP_INITIALIZER,
      useFactory: fetchUserInitializer, // Reference the factory function
      deps: [Store, RestApiService, Router], // Specify dependencies for the factory
      multi: true, // Allow multiple initializers
    },
    provideHttpClient(
      withInterceptorsFromDi(),
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      })
    ),
  ],
})
export class AppModule {}
