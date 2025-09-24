import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbToastModule, NgbTooltipModule, NgbProgressbarModule, NgbDropdownModule, NgbNavModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';

import { FlatpickrModule } from 'angularx-flatpickr';
// Counter
import { CountUpModule } from 'ngx-countup';
import { NgApexchartsModule } from 'ng-apexcharts';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { SimplebarAngularModule } from 'simplebar-angular';

// Swiper Slider
import { SlickCarouselModule } from 'ngx-slick-carousel';

import { NgSelectModule } from '@ng-select/ng-select';

import { LightboxModule } from 'ngx-lightbox';

// Load Icons
import { defineElement } from "@lordicon/element";
import lottie from 'lottie-web';

// Pages Routing
import { PagesRoutingModule } from "./pages-routing.module";
import { SharedModule } from "../shared/shared.module";
import { AppListComponent } from './app-list/app-list.component';
import { FeatherIconsModule } from '../shared-modules/feather-icons.module';
import { TranslateModule } from '@ngx-translate/core';
import { OrganizationComponent } from './organization/organization.component';
import { GroupComponent } from './master-data/group/group.component';
import { LineComponent } from './master-data/line/line.component';
import { SectionComponent } from './master-data/section/section.component';
import { SubSectionComponent } from './master-data/sub-section/sub-section.component';
import { OrganizationComponent as OrganizationMasterComponent } from './master-data/organization/organization.component';
import { EmailRecipientComponent } from './master-data/email-recipient/email-recipient.component';


@NgModule({
  declarations: [
    AppListComponent,
    OrganizationComponent,
    GroupComponent,
    LineComponent,
    SectionComponent,
    SubSectionComponent,
    OrganizationMasterComponent,
    EmailRecipientComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgbToastModule,
    NgbTooltipModule,
    NgbPaginationModule,
    NgbNavModule,
    NgbProgressbarModule,
    FlatpickrModule.forRoot(),
    CountUpModule,
    NgApexchartsModule,
    LeafletModule,
    NgbDropdownModule,
    SimplebarAngularModule,
    PagesRoutingModule,
    SharedModule,
    SlickCarouselModule,
    LightboxModule,
    FeatherIconsModule,
    TranslateModule,
    NgSelectModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PagesModule {
  constructor() {
    defineElement(lottie.loadAnimation);
  }
}
