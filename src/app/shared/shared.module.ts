import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbNavModule, NgbAccordionModule, NgbDropdownModule, NgbToastModule } from '@ng-bootstrap/ng-bootstrap';

// Swiper Slider
import { SlickCarouselModule } from 'ngx-slick-carousel';

// Counter
import { CountUpModule } from 'ngx-countup';

import { BreadcrumbsComponent } from './components/breadcrumbs/breadcrumbs.component';



import { ToastsContainer } from './components/toast/toasts-container.component';
import { ModalComponent } from './components/modal/modal.component';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [
    BreadcrumbsComponent,
    ToastsContainer,
    ModalComponent,
  ],
  imports: [
    CommonModule,
    NgbNavModule,
    NgbAccordionModule,
    NgbDropdownModule,
    NgbToastModule,
    SlickCarouselModule,
    CountUpModule,
    TranslateModule
  ],
  exports: [BreadcrumbsComponent, ToastsContainer, ModalComponent]
})
export class SharedModule { }
