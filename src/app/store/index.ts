import { ActionReducerMap } from "@ngrx/store";
import { LayoutState, layoutReducer } from "./layouts/layout-reducer";
import { authReducer, AuthState } from "./auth/auth.reducer";
import { remoteAppsReducer, RemoteAppsState } from "./remote-apps/remote-apps.reducer";
import { menuReducer, MenuState } from "./menu/menu.reducer";
import { translationReducer, TranslationState } from "./translation/translation.reducer";
import { LotnoReducer, LotnoState } from "./lotno/lotno.reducer";
import { ProdidentityReducer, ProdidentityState } from "./prodidentity/prodidentity.reducer";

export interface RootReducerState {
    layout: LayoutState;
    auth: AuthState,
    remoteApp: RemoteAppsState,
    menu: MenuState,
    translation: TranslationState,
    lotno: LotnoState,
    prodidentity: ProdidentityState
}

export const rootReducer: ActionReducerMap<RootReducerState> = {
    layout: layoutReducer,
    auth: authReducer,
    remoteApp: remoteAppsReducer,
    menu: menuReducer,
    translation: translationReducer,
    lotno: LotnoReducer,
    prodidentity: ProdidentityReducer,
}
