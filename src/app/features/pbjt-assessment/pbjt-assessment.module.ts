import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PbjtAssessmentRoutingModule } from './pbjt-assessment-routing.module';
import { PbjtAssessmentService } from './services/pbjt-assessment.service';

// Components
import { AssessmentListComponent } from './components/assessment-list/assessment-list.component';
import { AssessmentFormComponent } from './components/assessment-form/assessment-form.component';
import { AssessmentDetailComponent } from './components/assessment-detail/assessment-detail.component';
import { PbjtMapComponent } from './components/pbjt-map/pbjt-map.component';

@NgModule({
    declarations: [
        AssessmentListComponent,
        AssessmentFormComponent,
        AssessmentDetailComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        PbjtAssessmentRoutingModule,
        PbjtMapComponent
    ],
    providers: [
        PbjtAssessmentService
    ],
    exports: [
        AssessmentListComponent,
        AssessmentFormComponent,
        AssessmentDetailComponent
    ]
})
export class PbjtAssessmentModule { }
