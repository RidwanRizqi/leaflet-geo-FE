import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { BidangMapComponent } from './bidang-map/bidang-map.component';
import { BidangListComponent } from './bidang-list/bidang-list.component';
import {ThematicMapComponent} from "./thematic-map/thematic-map.component";

const routes: Routes = [
  {
    path: '',
    redirectTo: 'map',
    pathMatch: 'full'
  },
  {
    path: 'map',
    component: BidangMapComponent
  },
  {
    path: 'thematic-map',
    component: ThematicMapComponent
  },
  {
    path: 'list',
    component: BidangListComponent
  }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    BidangMapComponent,
    BidangListComponent
  ]
})
export class BidangModule { }
