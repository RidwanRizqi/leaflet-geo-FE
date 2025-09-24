import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { RestApiService } from 'src/app/core/services/rest-api.service';
import { setUser, setUserForApp } from 'src/app/store/auth/auth.action';
import { firstValueFrom, catchError, of, map } from 'rxjs';

export function fetchUserInitializer(store: Store, restApiService: RestApiService, router: Router) {
  return () =>
    firstValueFrom(
      restApiService.getLoggedInUser().pipe(
        map((response: any) => {
          if (response && response.data) {            
            store.dispatch(setUser({ user: response.data })); // Store user
            // store.dispatch(setUserForApp({ appName: 'fsb', user: response.data })); // Store user
          }
          return response;
        }),
        catchError((error) => {
          console.error('Error fetching current user:', error);
          // router.navigate(['/pages/error']); // Redirect to error page
          return of(null);
        })
      )
    );
}
