import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { TemplateListComponent } from './components/template-entity/template-list/template-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    component: TemplateListComponent,
    data: {
      title: 'Template Entity List',
      breadcrumb: 'Template Entity'
    }
  },
  // Tambahkan routes lain sesuai kebutuhan
  // {
  //   path: 'create',
  //   component: TemplateFormComponent,
  //   data: {
  //     title: 'Create Template Entity',
  //     breadcrumb: 'Create'
  //   }
  // },
  // {
  //   path: 'edit/:id',
  //   component: TemplateFormComponent,
  //   data: {
  //     title: 'Edit Template Entity',
  //     breadcrumb: 'Edit'
  //   }
  // }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TemplateFeatureRoutingModule { }
