import { createAction, props } from '@ngrx/store';

export const setRemoteTranslations = createAction(
  '[Translation] Set Remote Translations',
  props<{ appName: string; translations: any }>()
);
