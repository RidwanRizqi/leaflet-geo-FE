import { createSelector, createFeatureSelector } from '@ngrx/store';
import { MenuState } from './menu.reducer';

// ✅ Feature Selector for the Menu State
export const selectMenuState = createFeatureSelector<MenuState>('menu');

// ✅ Selector for Shell Menu
export const selectMenuItems = createSelector(
  selectMenuState,
  (state: MenuState) => state.menuItems
);

// // ✅ Selector for all Remote Menus
// export const selectRemoteMenus = createSelector(
//   selectMenuState,
//   (state: MenuState) => state.remoteMenus
// );

// // ✅ Selector for Active Menu (Dynamic)
// export const selectActiveMenu = (activeAppName: string) =>
//   createSelector(
//     selectMenuState,
//     (state: MenuState) => state.remoteMenus[activeAppName] || state.menuItems
//   );
