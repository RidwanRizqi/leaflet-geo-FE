import { createSelector, createFeatureSelector } from '@ngrx/store';
import { TranslationState } from './translation.reducer';

export const selectTranslationState = createFeatureSelector<TranslationState>('translation');

export const selectTranslations = createSelector(
  selectTranslationState,
  (state) => state.remoteTranslations
);
