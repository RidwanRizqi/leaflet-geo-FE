import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Component pages
import { AppListComponent } from './app-list/app-list.component';
import { OrganizationComponent as OrganizationListComponent } from './organization/organization.component';
import { GroupComponent } from './master-data/group/group.component';
import { LineComponent } from './master-data/line/line.component';
import { SectionComponent } from './master-data/section/section.component';
import { SubSectionComponent } from './master-data/sub-section/sub-section.component';
import { OrganizationComponent } from './master-data/organization/organization.component';
import { EmailRecipientComponent } from './master-data/email-recipient/email-recipient.component';

const routes: Routes = [
  {
    path: 'application-list',
    component: AppListComponent,
  },
  {
    path: 'organization-sitemap',
    component: OrganizationListComponent,
  },
  {
    path: 'master-data/group',
    component: GroupComponent,
  },
  {
    path: 'master-data/line',
    component: LineComponent,
  },
  {
    path: 'master-data/organization',
    component: OrganizationComponent,
  },
  {
    path: 'master-data/section',
    component: SectionComponent,
  },
  {
    path: 'master-data/sub-section',
    component: SubSectionComponent,
  },
  {
    path: 'master-data/email-recipient',
    component: EmailRecipientComponent,
  },
  {
    path: 'events',
    loadChildren: () => import('./events/events.module').then(m => m.EventsModule),
  },
  {
    path: 'bidang',
    loadChildren: () => import('./bidang/bidang.module').then(m => m.BidangModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PagesRoutingModule {}
