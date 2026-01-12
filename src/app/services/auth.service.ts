import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { clearUser, setUser } from 'src/app/store/auth/auth.action';
import { selectCurrentUser } from 'src/app/store/auth/auth.selector';
import { ApiResponse, LoginRequest, LoginResponse, ChangePasswordRequest } from '../models/auth.models';

@Injectable({ providedIn: 'root' })

export class AuthenticationService {
    private apiUrl = environment.apiUrl + 'api/auth/';

    constructor(
        private http: HttpClient,
        private router: Router,
        private store: Store
    ) { }

    /**
     * Login user
     * POST /api/auth/login
     */
    login(username: string, password: string) {
        const request: LoginRequest = { username, password };
        return this.http.post<ApiResponse<LoginResponse>>(this.apiUrl + 'login', request);
    }

    /**
     * Store token after successful login
     */
    storeToken(token: string): void {
        localStorage.setItem('auth_token', token);
    }

    /**
     * Get stored token
     */
    getToken(): string | null {
        return localStorage.getItem('auth_token');
    }

    /**
     * Clear stored token
     */
    clearToken(): void {
        localStorage.removeItem('auth_token');
    }

    /**
     * Logout user
     * POST /api/auth/logout
     */
    async logout() {
        try {
            // Call API to log out
            await firstValueFrom(this.http.post<ApiResponse<void>>(this.apiUrl + 'logout', {}));
        } catch (error) {
            console.error('Error calling logout API:', error);
        } finally {
            // Always clear local data
            this.clearToken();
            this.store.dispatch(clearUser());
            this.router.navigate(['/auth/signin']);
        }
    }

    /**
     * Handle token expiry - redirect to login
     */
    async handleTokenExpiry(): Promise<void> {
        this.clearToken();
        this.store.dispatch(clearUser());

        // Extract returnUrl from URL hash
        const hash = window.location.hash;
        const queryString = hash.includes('?') ? hash.split('?')[1] : '';
        const urlParams = new URLSearchParams(queryString);
        const returnUrl = urlParams.get('returnUrl');

        this.router.navigate(['/auth/signin'], { queryParams: { returnUrl } });
    }

    /**
     * Change password
     * POST /api/auth/changepass
     */
    changePassword(oldPass: string, newPass: string) {
        const request: ChangePasswordRequest = { oldPass, newPass };
        return this.http.post<ApiResponse<void>>(this.apiUrl + 'changepass', request);
    }

    /**
     * Get current logged in user
     * GET /api/auth/me
     */
    getLoggedInUser() {
        return this.http.get<ApiResponse<LoginResponse>>(this.apiUrl + 'me');
    }

    /**
     * Check if user has required role
     */
    userHasRole(roles: string[] = []): boolean {
        let userRoles: string[] = [];

        this.store.select(selectCurrentUser).subscribe(user => {
            userRoles = (user?.roles_name as string[]) || [];
        });

        const lowerCaseUserRoles = userRoles.map(role => role.toLowerCase());
        return roles.some(role => lowerCaseUserRoles.includes(role.toLowerCase()));
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!this.getToken();
    }
}
