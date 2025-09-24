import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService } from 'src/app/core/services/language.service';

// Load Icons
import { defineElement } from "@lordicon/element";
import lottie from 'lottie-web';

// Component
import { AltComponent } from './alt/alt.component';
import { Page500Component } from './page500/page500.component';

@NgModule({
  declarations: [
    AltComponent,
    Page500Component
  ],
  imports: [
    CommonModule,
    TranslateModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [LanguageService]
})
export class ErrorsModule { 
  constructor() {
    defineElement(lottie.loadAnimation);
  }
}
