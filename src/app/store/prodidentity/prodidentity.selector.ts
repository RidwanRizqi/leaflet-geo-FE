import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ProdidentityState } from './prodidentity.reducer';

export const selectProdidentityState =
  createFeatureSelector<ProdidentityState>('prodidentity');

export const selectProdidentity = createSelector(
  selectProdidentityState,
  (state: ProdidentityState) => state
);
