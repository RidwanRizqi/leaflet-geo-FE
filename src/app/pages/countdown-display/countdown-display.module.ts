import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { CountdownDisplayComponent } from './countdown-display.component';

const routes: Routes = [
  {
    path: '',
    component: CountdownDisplayComponent
  }
];

@NgModule({
  declarations: [
    CountdownDisplayComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes)
  ]
})
export class CountdownDisplayModule { }
