import { createAction, props } from '@ngrx/store';

export const setUser = createAction(
    '[Auth] Set User',
    props<{ user: any }>()
);

export const setMenuPermissions = createAction(
    '[Auth] Set Menu Permissions',
    props<{ menuIds: number[] | null }>()
);

export const setUserForApp = createAction(
    '[Auth] Set User for Remote App',
    props<{ appName: string; user: any }>()
);

export const clearUser = createAction('[Auth] Clear User');
