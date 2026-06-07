import { createReducer, on } from '@ngrx/store';
import { setUser, setMenuPermissions, setUserForApp, clearUser } from './auth.action';

export interface AuthState {
    user: any | null; // Global user for the shell
    remoteUsers: Record<string, any>; // Ensuring an index signature
    menuPermissions: number[] | null; // null = all access, [] = no access
}

const initialState: AuthState = {
    user: null,
    remoteUsers: {},
    menuPermissions: null
};

export const authReducer = createReducer(
    initialState,
    on(setUser, (state, { user }) => ({
        ...state,
        user
    })),
    on(setMenuPermissions, (state, { menuIds }) => ({
        ...state,
        menuPermissions: menuIds
    })),
    on(setUserForApp, (state, { appName, user }) => ({
        ...state,
        remoteUsers: {
            ...state.remoteUsers,
            [appName]: user
        }
    })),
    on(clearUser, (state) => ({
        ...state,
        user: null,
        remoteUsers: {},
        menuPermissions: null
    }))
);
