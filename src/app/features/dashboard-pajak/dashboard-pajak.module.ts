import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';

import { DashboardPajakComponent } from './dashboard-pajak.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardPajakComponent
  }
];

@NgModule({
  declarations: [
    DashboardPajakComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    NgApexchartsModule,
    RouterModule.forChild(routes)
  ]
})
export class DashboardPajakModule { }
