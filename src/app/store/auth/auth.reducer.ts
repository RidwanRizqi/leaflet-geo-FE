import { createReducer, on } from '@ngrx/store';
import { setUser, setUserForApp, clearUser } from './auth.action';

export interface AuthState {
    user: any | null; // Global user for the shell
    remoteUsers: Record<string, any>; // Ensuring an index signature
}

const initialState: AuthState = {
    user: null,
    remoteUsers: {}
};

export const authReducer = createReducer(
    initialState,
    on(setUser, (state, { user }) => ({
        ...state,
        user
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
        remoteUsers: {}
    }))
);
