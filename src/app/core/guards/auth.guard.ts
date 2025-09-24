import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { from, Observable, of } from 'rxjs';
import { map, switchMap, catchError, take } from 'rxjs/operators';

// Auth Services
import { AuthenticationService } from '../services/auth.service';
import { RestApiService } from '../services/rest-api.service';
import { setUser } from 'src/app/store/auth/auth.action';
import { RemoteConfigService } from '../services/remote-config.service';
import { setMenu } from 'src/app/store/menu/menu.action';
import { MENU } from 'src/app/layouts/sidebar/menu';
import { selectCurrentUser } from 'src/app/store/auth/auth.selector';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    constructor(
        private router: Router,
        private authenticationService: AuthenticationService,
        private restApiService: RestApiService,
        private remoteConfigService: RemoteConfigService,
        private store: Store
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
        return this.store.select(selectCurrentUser).pipe(
            take(1), // Ensure it only runs once
            switchMap(user => {
                if (!user) {                    
                    this.router.navigate(['/auth/signin'], { queryParams: { returnUrl: state.url } });
                    return of(false);
                }

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

                            // Dispatch user info from the fetched config
                            // if (config.data) {
                            //     this.store.dispatch(setUser({ user: config.data }));
                            // }

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
            })
        );
    }
}
