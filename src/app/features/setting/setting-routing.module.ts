import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { KecamatanComponent } from './kecamatan/kecamatan.component';
import { KelurahanComponent } from './kelurahan/kelurahan.component';
import { BlokComponent } from './blok/blok.component';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'kecamatan',
        pathMatch: 'full'
    },
    {
        path: 'kecamatan',
        component: KecamatanComponent
    },
    {
        path: 'kelurahan',
        component: KelurahanComponent
    },
    {
        path: 'blok',
        component: BlokComponent
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class SettingRoutingModule { }
