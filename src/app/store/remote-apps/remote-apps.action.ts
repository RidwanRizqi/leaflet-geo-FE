import { createAction, props } from '@ngrx/store';

export const setRemoteApps = createAction(
  '[Remote Apps] Set Remote Apps',
  props<{ remoteApps: Record<string, string> }>() // Example: { "app1": "http://url1", "app2": "http://url2" }
);
