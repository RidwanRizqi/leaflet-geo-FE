import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { clearUser, setUser } from 'src/app/store/auth/auth.action';
import { selectCurrentUser } from 'src/app/store/auth/auth.selector';

@Injectable({ providedIn: 'root' })

export class AuthenticationService {
    apiUrl = environment.apiUrl + 'api/';

    constructor(
        private http: HttpClient,
        private router: Router,
        private store: Store
    ) {}

    /**
     * Performs the auth
     * @param employeeCode employeeCode of user
     * @param password password of user
     */
    login(employeeCode: string, password: string) {
      return this.http.post(this.apiUrl + 'auth/login', {
          employeeCode,
          password
        }, { });
  }

    /**
     * Logout the user
     */
    async logout() {
        try {
            // Remove session-related data
            this.clearLocalStorage();
            this.deleteCookie('XSRF-TOKEN');
            this.deleteCookie('SESSION-PRD');

            // Call API to log out
            await firstValueFrom(this.http.post(this.apiUrl + 'auth/logout', {}));

            // Dispatch logout action to clear user data in store
            this.store.dispatch(clearUser());

        } catch (error) {
            console.error('Error logging out:', error);
        }
    }

    async handleTokenExpiry(): Promise<void> {
        try {
            // Remove session-related data
            this.clearLocalStorage();
            this.deleteCookie('XSRF-TOKEN');
            this.deleteCookie('SESSION-PRD');

            // Dispatch logout action to clear user data in store
            this.store.dispatch(clearUser());

            // Extract returnUrl from URL hash
            const hash = window.location.hash;
            const queryString = hash.includes('?') ? hash.split('?')[1] : '';
            const urlParams = new URLSearchParams(queryString);
            const returnUrl = urlParams.get('returnUrl');

            console.log('Return URL:', returnUrl);
            this.router.navigate(['/auth/signin'], { queryParams: { returnUrl } });

        } catch (error) {
            console.error('Error logging out user:', error);
        }
    }

    userHasRole(roles: string[] = []): boolean {
      let userRoles: string[] = [];
  
      // Get user roles from store
      this.store.select(selectCurrentUser).subscribe(user => {
          userRoles = (user?.roles_name as string[]) || [];
      });
  
      const lowerCaseUserRoles = userRoles.map(role => role.toLowerCase());
  
      return roles.some(role => lowerCaseUserRoles.includes(role.toLowerCase()));
  }
  

    deleteCookie(name: string): void {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    }

    getLoggedInUser() {
        return this.http.get(this.apiUrl + 'auth/info', { withCredentials: true });
    }

    private clearLocalStorage(): void {
        // Clear any localstorage item here
        // Object.keys(localStorage).forEach(key => {
        //     if (key.startsWith('remainingTime_')) {
        //         localStorage.removeItem(key);
        //     }
        // });
    }
}
