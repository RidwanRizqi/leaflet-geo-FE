import { createReducer, on } from '@ngrx/store';
import { setMenu } from 'src/app/store/menu/menu.action';
import { MenuItem } from './menu.model';

export interface MenuState {
  menuItems: MenuItem[];  // ✅ Shell menu
  // remoteMenus: { [appName: string]: MenuItem[] }; // ✅ Store menus per remote app
}

export const initialState: MenuState = {
  menuItems: [],
  // remoteMenus: {}
};

export const menuReducer = createReducer(
  initialState,
  
  // ✅ Set Shell Menu
  on(setMenu, (state, { menuItems }) => ({
    ...state,
    menuItems
  })),

  // // ✅ Store multiple remote menus
  // on(setRemoteMenu, (state, { appName, menuItems }) => ({
  //   ...state,
  //   remoteMenus: { ...state.remoteMenus, [appName]: menuItems }
  // }))
);
