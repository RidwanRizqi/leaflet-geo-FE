import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LaporanDinasComponent } from './laporan-dinas.component';

const routes: Routes = [
  {
    path: '',
    component: LaporanDinasComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LaporanDinasRoutingModule { }
