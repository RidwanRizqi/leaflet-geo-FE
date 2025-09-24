import { createAction, props } from '@ngrx/store';

export const setLotno = createAction(
    '[Lotno] Set Lotno',
    props<{ lotno: string }>()
);

export const clearLotno = createAction('[Lotno] Clear Lotno');
