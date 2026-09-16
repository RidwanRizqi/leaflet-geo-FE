import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgbNavModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '../../shared/shared.module';

import { LaporanDinasRoutingModule } from './laporan-dinas-routing.module';
import { LaporanDinasComponent } from './laporan-dinas.component';

@NgModule({
  declarations: [
    LaporanDinasComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgbNavModule,
    NgbDropdownModule,
    SharedModule,
    LaporanDinasRoutingModule
  ]
})
export class LaporanDinasModule { }
