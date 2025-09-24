import { createReducer, on } from '@ngrx/store';
import { setRemoteApps } from './remote-apps.action';

export interface RemoteAppsState {
  remoteApps: Record<string, string>;
}

const initialState: RemoteAppsState = {
  remoteApps: {}
};

export const remoteAppsReducer = createReducer(
  initialState,
  on(setRemoteApps, (state, { remoteApps }) => ({ ...state, remoteApps }))
);
