import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { combineLatest } from 'rxjs';
import { take } from 'rxjs/operators';
import { selectCurrentUser, selectMenuPermissions } from 'src/app/store/auth/auth.selector';
import { MENU } from 'src/app/components/layouts/sidebar/menu';
import { MenuItem } from 'src/app/components/layouts/sidebar/menu.model';

@Component({
  selector: 'app-default-route',
  template: `
    <div class="d-flex justify-content-center align-items-center vh-100">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Memuat...</span>
      </div>
    </div>
  `
})
export class DefaultRouteComponent implements OnInit {
  constructor(
    private store: Store,
    private router: Router
  ) {}

  ngOnInit(): void {
    combineLatest([
      this.store.select(selectCurrentUser),
      this.store.select(selectMenuPermissions)
    ]).pipe(take(1)).subscribe(([user, permissions]) => {
      const role = user?.role?.toUpperCase();

      // Role MAGANG always defaults to absensi
      if (role === 'MAGANG') {
        this.router.navigate(['/absensi'], { replaceUrl: true });
        return;
      }

      // If permissions are not configured or full access (null)
      if (permissions === null) {
        switch (role) {
          case 'GIS':
            this.router.navigate(['/bidang/map'], { replaceUrl: true });
            break;
          case 'PBJT-HOTEL':
            this.router.navigate(['/pbjt-hotel/assessment-list'], { replaceUrl: true });
            break;
          case 'PBJT-MAMIN':
            this.router.navigate(['/pbjt-makanan'], { replaceUrl: true });
            break;
          default:
            this.router.navigate(['/dashboard-pajak'], { replaceUrl: true });
            break;
        }
        return;
      }

      // If user has specific menu permissions:
      // If user has access to dashboard-pajak (menu id 7)
      if (permissions.includes(7)) {
        this.router.navigate(['/dashboard-pajak'], { replaceUrl: true });
        return;
      }

      // If user has access to absensi (menu id 12 or 121)
      if (permissions.includes(12) || permissions.includes(121)) {
        this.router.navigate(['/absensi'], { replaceUrl: true });
        return;
      }

      // Otherwise find the first allowed link from MENU
      const findFirstRoute = (items: MenuItem[]): string | null => {
        for (const item of items) {
          if (item.id && permissions.includes(item.id) && item.link && item.link !== '#' && !item.link.startsWith('http')) {
            return item.link;
          }
          if (item.subItems && item.subItems.length > 0) {
            const sub = findFirstRoute(item.subItems);
            if (sub) return sub;
          }
        }
        return null;
      };

      const targetRoute = findFirstRoute(MENU);
      if (targetRoute) {
        this.router.navigate([targetRoute], { replaceUrl: true });
      } else {
        this.router.navigate(['/absensi'], { replaceUrl: true });
      }
    });
  }
}
