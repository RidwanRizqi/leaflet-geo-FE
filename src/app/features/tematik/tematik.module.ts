import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ThematicMapComponent } from '../bidang/thematic-map/thematic-map.component';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'penggunaan-tanah',
        pathMatch: 'full'
    },
    {
        path: 'penggunaan-tanah',
        component: ThematicMapComponent,
        data: { tematikType: 'gunaTanah', title: 'Penggunaan Tanah' }
    },
    {
        path: 'kelas-tanah',
        component: ThematicMapComponent,
        data: { tematikType: 'kelasTanah', title: 'Kelas Tanah' }
    },
    {
        path: 'penggunaan-bangunan',
        component: ThematicMapComponent,
        data: { tematikType: 'gunaBangunan', title: 'Penggunaan Bangunan' }
    },
    {
        path: 'kelas-bangunan',
        component: ThematicMapComponent,
        data: { tematikType: 'kelasBangunan', title: 'Kelas Bangunan' }
    },
    {
        path: 'znt',
        component: ThematicMapComponent,
        data: { tematikType: 'znt', title: 'ZNT' }
    },
    {
        path: 'ketetapan-per-buku',
        component: ThematicMapComponent,
        data: { tematikType: 'tetapBuku', title: 'Ketetapan Per Buku' }
    },
    {
        path: 'nilai-individu',
        component: ThematicMapComponent,
        data: { tematikType: 'nilaiIndividu', title: 'Nilai Individu' }
    },
    {
        path: 'status-pembayaran',
        component: ThematicMapComponent,
        data: { tematikType: 'statusBayar', title: 'Status Pembayaran' }
    }
];

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        ThematicMapComponent
    ]
})
export class TematikModule { }
