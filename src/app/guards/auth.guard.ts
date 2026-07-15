import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { from, Observable, of } from 'rxjs';
import { map, switchMap, catchError, take } from 'rxjs/operators';

// Auth Services
import { AuthenticationService } from '../services/auth.service';
import { RoleMenuService } from '../services/role-menu.service';
import { setUser, setMenuPermissions } from 'src/app/store/auth/auth.action';
import { RemoteConfigService } from '../services/remote-config.service';
import { setMenu } from 'src/app/store/menu/menu.action';
import { MENU } from 'src/app/components/layouts/sidebar/menu';
import { selectCurrentUser, selectMenuPermissions } from 'src/app/store/auth/auth.selector';
import { MenuItem } from 'src/app/components/layouts/sidebar/menu.model';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    constructor(
        private router: Router,
        private authenticationService: AuthenticationService,
        private roleMenuService: RoleMenuService,
        private remoteConfigService: RemoteConfigService,
        private store: Store
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        // First check if token exists in localStorage
        const token = this.authenticationService.getToken();

        if (!token) {
            // No token, redirect to login
            this.router.navigate(['/auth/signin'], { queryParams: { returnUrl: state.url } });
            return of(false);
        }

        return this.store.select(selectCurrentUser).pipe(
            take(1),
            switchMap(user => {
                if (!user) {
                    // Token exists but user not in store - try to fetch user info
                    return from(this.authenticationService.getLoggedInUser()).pipe(
                        switchMap(response => {
                            if (response.success && response.data) {
                                // Set user in store
                                this.store.dispatch(setUser({
                                    user: {
                                        nama: response.data.nama,
                                        role: response.data.role,
                                        idUnit: response.data.idUnit,
                                        token: response.data.token
                                    }
                                }));
                                // Load menu permissions
                                    return from(this.loadMenuPermissions(response.data.role)).pipe(
                                        switchMap(() => this.checkRouteAccess(route, state))
                                    );
                            } else {
                                // Token invalid, clear and redirect
                                this.authenticationService.clearToken();
                                this.router.navigate(['/auth/signin'], { queryParams: { returnUrl: state.url } });
                                return of(false);
                            }
                        }),
                        catchError(error => {
                            console.error('Error fetching user info:', error);
                            this.authenticationService.clearToken();
                            this.router.navigate(['/auth/signin'], { queryParams: { returnUrl: state.url } });
                            return of(false);
                        })
                    );
                }

                // Load menu permissions if not yet loaded
                    return from(this.roleMenuService.getMyPermissions()).pipe(
                        switchMap(menuIds => {
                            this.store.dispatch(setMenuPermissions({ menuIds: menuIds ?? null }));
                            return this.checkRouteAccess(route, state);
                        }),
                        catchError(() => {
                            this.store.dispatch(setMenuPermissions({ menuIds: [] }));
                            return this.checkRouteAccess(route, state);
                        })
                );
            })
        );
    }

    private async loadMenuPermissions(role: string): Promise<void> {
        try {
            const menuIds = await from(this.roleMenuService.getMyPermissions()).toPromise();
            this.store.dispatch(setMenuPermissions({ menuIds: menuIds ?? null }));
        } catch (error) {
            console.error('Error loading menu permissions:', error);
            this.store.dispatch(setMenuPermissions({ menuIds: [] }));
        }
    }

    private pathMenuMap: Map<string, number[]> | null = null;

    private getPathMenuMap(): Map<string, number[]> {
        if (this.pathMenuMap) return this.pathMenuMap;
        const map = new Map<string, number[]>();
        const flatten = (items: MenuItem[]) => {
            for (const item of items) {
                if (item.link && item.link !== '#') {
                    const existing = map.get(item.link) || [];
                    existing.push(item.id!);
                    map.set(item.link, existing);
                }
                if (item.subItems && item.subItems.length > 0) {
                    flatten(item.subItems);
                }
            }
        };
        flatten(MENU);
        this.pathMenuMap = map;
        return map;
    }

    private checkRouteAccess(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        console.log('Route Data:', route.data);

        if (route.data['remoteApp']) {
            const appName = route.data['remoteApp'];
            console.log('Accessing Remote App:', appName);

            return from(this.remoteConfigService.getConfig(appName)).pipe(
                switchMap(config => {
                    if (!config) {
                        console.error(`Failed to load config for ${appName}`);
                        return of(false);
                    }
                    console.log('Loaded remote config:', config);
                    return of(true);
                }),
                catchError(error => {
                    console.error('Error fetching remote config:', error);
                    return of(false);
                })
            );
        }

        if (!route.data['remoteApp']) {
            console.log('Accessing Shell App:');
            this.store.dispatch(setMenu({ menuItems: MENU }));
        }

        if (route.data['role'] && !this.authenticationService.userHasRole(route.data['role'])) {
            return of(false);
        }

        const path = state.url.split('?')[0];
        const unprotectedPaths = ['/auth/signin', '/auth', '/pages/error'];
        const isUnprotected = unprotectedPaths.some(p => path === p || path.startsWith(p + '/'));

        if (!isUnprotected) {
            const pathMap = this.getPathMenuMap();
            const menuIds = pathMap.get(path);
            if (menuIds && menuIds.length > 0) {
                return this.store.select(selectMenuPermissions).pipe(
                    take(1),
                    map(permissions => {
                        if (permissions === null) return true;
                        const hasAccess = menuIds.some(id => permissions.includes(id));
                        if (!hasAccess) {
                            console.warn(`Access denied to "${path}" - missing menu permission`);
                            return false;
                        }
                        return true;
                    })
                );
            }
        }

        return of(true);
    }
}
