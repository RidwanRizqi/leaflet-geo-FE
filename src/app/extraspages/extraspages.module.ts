import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

// Component pages
import { ExtrapagesRoutingModule } from './extraspages-routing.module';
import { MaintenanceComponent } from './maintenance/maintenance.component';
import { ComingSoonComponent } from './coming-soon/coming-soon.component';
import { ErrorsModule } from './errors/errors.module';

@NgModule({
  declarations: [
    MaintenanceComponent,
    ComingSoonComponent
  ],
  imports: [
    CommonModule,
    ExtrapagesRoutingModule,
    ErrorsModule
  ]
})
export class ExtraspagesModule { }
