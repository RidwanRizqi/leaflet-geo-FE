import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuFungsiRoutingModule } from './menu-fungsi-routing.module';
import { MenuFungsiComponent } from './menu-fungsi.component';

@NgModule({
  declarations: [
    MenuFungsiComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    MenuFungsiRoutingModule
  ]
})
export class MenuFungsiModule { }
