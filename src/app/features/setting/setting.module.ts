import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbTooltipModule, NgbPaginationModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';

import { SettingRoutingModule } from './setting-routing.module';
import { SharedModule } from '../../shared/shared.module';

import { KecamatanComponent } from './kecamatan/kecamatan.component';
import { KelurahanComponent } from './kelurahan/kelurahan.component';
import { BlokComponent } from './blok/blok.component';

// Load Icons
import { defineElement } from "@lordicon/element";
import lottie from 'lottie-web';

@NgModule({
    declarations: [
        KecamatanComponent,
        KelurahanComponent,
        BlokComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        NgbTooltipModule,
        NgbPaginationModule,
        NgbDropdownModule,
        NgSelectModule,
        TranslateModule,
        LeafletModule,
        SettingRoutingModule,
        SharedModule
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class SettingModule {
    constructor() {
        defineElement(lottie.loadAnimation);
    }
}
