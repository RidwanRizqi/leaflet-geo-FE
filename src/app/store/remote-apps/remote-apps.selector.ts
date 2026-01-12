import { createSelector, createFeatureSelector } from '@ngrx/store';
import { RemoteAppsState } from './remote-apps.reducer';

export const selectRemoteAppsState = createFeatureSelector<RemoteAppsState>('remoteApp');

export const selectRemoteAppUrl = (appName: string) =>
  createSelector(selectRemoteAppsState, (state) => state.remoteApps[appName] || null);
