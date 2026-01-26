import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { from, Observable, of } from 'rxjs';
import { map, switchMap, catchError, take } from 'rxjs/operators';

// Auth Services
import { AuthenticationService } from '../services/auth.service';
import { setUser } from 'src/app/store/auth/auth.action';
import { RemoteConfigService } from '../services/remote-config.service';
import { setMenu } from 'src/app/store/menu/menu.action';
import { MENU } from 'src/app/components/layouts/sidebar/menu';
import { selectCurrentUser } from 'src/app/store/auth/auth.selector';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    constructor(
        private router: Router,
        private authenticationService: AuthenticationService,
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
                                return this.checkRouteAccess(route);
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

                return this.checkRouteAccess(route);
            })
        );
    }

    private checkRouteAccess(route: ActivatedRouteSnapshot): Observable<boolean> {
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
            this.router.navigate(['/pages/error'], { queryParams: { q: '401' } });
            return of(false);
        }

        return of(true);
    }
}
