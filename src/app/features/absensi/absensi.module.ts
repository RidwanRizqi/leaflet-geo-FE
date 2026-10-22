import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AbsensiRoutingModule } from './absensi-routing.module';
import { AbsensiUserComponent } from './absensi-user/absensi-user.component';
import { AbsensiAdminComponent } from './absensi-admin/absensi-admin.component';

@NgModule({
  declarations: [
    AbsensiUserComponent,
    AbsensiAdminComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AbsensiRoutingModule
  ]
})
export class AbsensiModule {}
