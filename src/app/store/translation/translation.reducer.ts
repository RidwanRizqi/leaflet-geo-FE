import { createReducer, on } from '@ngrx/store';
import { setRemoteTranslations } from './translation.action';

export interface TranslationState {
  remoteTranslations: any;
}

const initialState: TranslationState = {
  remoteTranslations: {}
};

export const translationReducer = createReducer(
  initialState,
  on(setRemoteTranslations, (state, { appName, translations }) => ({
    ...state,
    remoteTranslations: { ...state.remoteTranslations, [appName]: translations }
  }))
);
