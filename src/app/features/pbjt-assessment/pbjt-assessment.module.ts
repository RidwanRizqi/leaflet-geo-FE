import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { PbjtAssessmentRoutingModule } from './pbjt-assessment-routing.module';
import { PbjtAssessmentService } from './services/pbjt-assessment.service';
import { SharedModule } from '../../shared/shared.module';

// Components
import { AssessmentListComponent } from './components/assessment-list/assessment-list.component';
import { AssessmentFormComponent } from './components/assessment-form/assessment-form.component';
import { AssessmentDetailComponent } from './components/assessment-detail/assessment-detail.component';
import { PotensiListComponent } from './components/potensi/potensi-list/potensi-list.component';
import { PotensiFormComponent } from './components/potensi/potensi-form/potensi-form.component';
import { PotensiDetailComponent } from './components/potensi/potensi-detail/potensi-detail.component';
import { PotensiPendataanComponent } from './components/potensi/potensi-pendataan/potensi-pendataan.component';

@NgModule({
  declarations: [
    AssessmentListComponent,
    AssessmentFormComponent,
    AssessmentDetailComponent,
    PotensiListComponent,
    PotensiFormComponent,
    PotensiDetailComponent,
    PotensiPendataanComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    PbjtAssessmentRoutingModule
  ],
  providers: [
    PbjtAssessmentService
  ]
})
export class PbjtAssessmentModule { }
