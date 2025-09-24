import { createSelector, createFeatureSelector } from '@ngrx/store';
import { LotnoState } from './lotno.reducer';

// Feature selector for the authentication state
export const selectLotnoState = createFeatureSelector<LotnoState>('lotno');

// Selector to get the global current user (shell)
export const selectLotno = createSelector(
    selectLotnoState,
    (state: LotnoState) => state.lotno
);
