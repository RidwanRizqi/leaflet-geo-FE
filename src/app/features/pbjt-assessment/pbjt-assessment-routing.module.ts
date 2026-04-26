import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AssessmentListComponent } from './components/assessment-list/assessment-list.component';
import { AssessmentFormComponent } from './components/assessment-form/assessment-form.component';
import { AssessmentDetailComponent } from './components/assessment-detail/assessment-detail.component';
import { PbjtMapComponent } from './components/pbjt-map/pbjt-map.component';    

const routes: Routes = [
    {
        path: '',
        component: AssessmentListComponent
    },
    {
        path: 'map',
        component: PbjtMapComponent
    },
    {
        path: 'create',
        component: AssessmentFormComponent
    },
    {
        path: 'edit/:id',
        component: AssessmentFormComponent
    },
    {
        path: 'detail/:id',
        component: AssessmentDetailComponent
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./components/hotel/dashboard/dashboard.component').then(m => m.HotelDashboardComponent)
    },
    {
        path: 'properties',
        loadComponent: () => import('./components/hotel/properties/property-list.component').then(m => m.HotelPropertyListComponent)
    },
    {
        path: 'projections',
        loadComponent: () => import('./components/hotel/projections/projection-dashboard.component').then(m => m.HotelProjectionDashboardComponent)
    },
    {
        path: 'formalization',
        loadComponent: () => import('./components/hotel/formalization/formalization-dashboard.component').then(m => m.HotelFormalizationDashboardComponent)     
    },
    {
        path: 'reports',
        loadComponent: () => import('./components/hotel/reports/report-generator.component').then(m => m.HotelReportGeneratorComponent)
    },
    {
        path: 'hotel-map',
        loadComponent: () => import('./components/hotel/map-view/hotel-map-view.component').then(m => m.HotelMapViewComponent)
    },
    {
        path: 'assessment-list',
        loadComponent: () => import('./components/hotel/assessment-list/hotel-assessment-list.component').then(m => m.HotelAssessmentListComponent)
    },
    {
        path: 'hotel-create',
        loadComponent: () => import('./components/hotel/assessment-form/hotel-assessment-form.component').then(m => m.HotelAssessmentFormComponent)
    },
    {
        path: 'hotel-edit/:id',
        loadComponent: () => import('./components/hotel/assessment-form/hotel-assessment-form.component').then(m => m.HotelAssessmentFormComponent)
    },
    {
        path: 'hotel-detail/:id',
        loadComponent: () => import('./components/hotel/assessment-detail/hotel-assessment-detail.component').then(m => m.HotelAssessmentDetailComponent)       
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class PbjtAssessmentRoutingModule { }

