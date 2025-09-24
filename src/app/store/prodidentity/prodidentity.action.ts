import { createAction, props } from '@ngrx/store';

export const setProdidentity = createAction(
  '[Prodidentity] Set Prodidentity',
  props<{
    lotno_dough: string;
    lotno_finish_good: string;
    product_code: string;
    tanggal_lotno: string;
    active_pro: string;
  }>()
);
