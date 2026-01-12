import { NgModule, Component } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { LayoutComponent } from './components/layouts/layout.component';

// Auth
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],  // Added AuthGuard here
    children: [
      { path: '', redirectTo: 'dashboard-pajak', pathMatch: 'full' },
      { path: 'dashboard-pajak', loadChildren: () => import('./features/dashboard-pajak/dashboard-pajak.module').then(m => m.DashboardPajakModule) },
      { path: 'dashboard-pendapatan', loadComponent: () => import('./features/dashboard-pendapatan/dashboard-pendapatan.component').then(m => m.DashboardPendapatanComponent) },
      { path: '', loadChildren: () => import('./features/pages.module').then(m => m.PagesModule) }
    ]
  },
  { path: 'auth', loadChildren: () => import('./account/account.module').then(m => m.AccountModule) },
  { path: 'pages', loadChildren: () => import('./extraspages/extraspages.module').then(m => m.ExtraspagesModule) },
  {
    path: 'countdown-display',
    loadChildren: () => import('./features/countdown-display/countdown-display.module').then(m => m.CountdownDisplayModule)
    // No layout component - standalone fullscreen display
  },
  { path: '**', redirectTo: '/pages/error' }, // Redirect unknown routes to error page
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
