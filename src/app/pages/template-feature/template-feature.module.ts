import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Third Party Modules
import { NgbToastModule, NgbTooltipModule, NgbProgressbarModule, NgbDropdownModule, NgbNavModule, NgbPaginationModule, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';

// Routing
import { TemplateFeatureRoutingModule } from './template-feature-routing.module';

// Shared Module
import { SharedModule } from '../../shared/shared.module';
import { FeatherIconsModule } from '../../shared-modules/feather-icons.module';

// Components
import { TemplateListComponent } from './components/template-entity/template-list/template-list.component';
import { TemplateFormComponent } from './components/template-entity/template-form/template-form.component';

@NgModule({
  declarations: [
    TemplateListComponent,
    TemplateFormComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TemplateFeatureRoutingModule,
    SharedModule,
    FeatherIconsModule,
    TranslateModule,
    NgbToastModule,
    NgbTooltipModule,
    NgbProgressbarModule,
    NgbDropdownModule,
    NgbNavModule,
    NgbPaginationModule,
    NgbModalModule,
    NgSelectModule,
  ],
  providers: []
})
export class TemplateFeatureModule { }
