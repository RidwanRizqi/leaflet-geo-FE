import { createAction, props } from '@ngrx/store';

export const setUser = createAction(
    '[Auth] Set User',
    props<{ user: any }>()
);

export const setUserForApp = createAction(
    '[Auth] Set User for Remote App',
    props<{ appName: string; user: any }>()
);

export const clearUser = createAction('[Auth] Clear User');
