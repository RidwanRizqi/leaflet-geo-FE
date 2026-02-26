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
    }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class PbjtAssessmentRoutingModule { }
