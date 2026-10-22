import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AbsensiUserComponent } from './absensi-user/absensi-user.component';
import { AbsensiAdminComponent } from './absensi-admin/absensi-admin.component';

const routes: Routes = [
  {
    path: '',
    component: AbsensiUserComponent
  },
  {
    path: 'admin',
    component: AbsensiAdminComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AbsensiRoutingModule {}
