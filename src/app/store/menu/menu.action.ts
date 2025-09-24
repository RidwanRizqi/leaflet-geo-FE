import { createAction, props } from '@ngrx/store';

export const setMenu = createAction(
  '[Menu] Set Menu',
  props<{ menuItems: any }>()
);

// export const setRemoteMenu = createAction(
//   '[Menu] Set Remote Menu',
//   props<{ appName: string; menuItems: any }>()  // ✅ Store menus per remote app
// );
