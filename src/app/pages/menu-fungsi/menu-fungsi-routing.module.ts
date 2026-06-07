import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MenuFungsiComponent } from './menu-fungsi.component';

const routes: Routes = [
  {
    path: '',
    component: MenuFungsiComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MenuFungsiRoutingModule { }
