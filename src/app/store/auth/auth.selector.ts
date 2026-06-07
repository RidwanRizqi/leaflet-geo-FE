import { createSelector, createFeatureSelector } from '@ngrx/store';
import { AuthState } from './auth.reducer';

// Feature selector for the authentication state
export const selectAuthState = createFeatureSelector<AuthState>('auth');

// Selector to get the global current user (shell)
export const selectCurrentUser = createSelector(
    selectAuthState,
    (state: AuthState) => state.user
);

// Selector to get the menu permissions for current user
export const selectMenuPermissions = createSelector(
    selectAuthState,
    (state: AuthState) => state.menuPermissions
);

// Selector to determine if user has access to a specific menuId
export const selectHasMenuAccess = (menuId: number) =>
    createSelector(
        selectMenuPermissions,
        (permissions) => permissions === null || permissions.includes(menuId)
    );

// Selector to get the user for a specific remote app
export const selectUserByApp = (appName: string) =>
    createSelector(
        selectAuthState,
        (state: AuthState) => state.remoteUsers?.[appName] ?? null
    );
