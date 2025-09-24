import { createReducer, on } from '@ngrx/store';
import { setProdidentity } from './prodidentity.action';

export interface ProdidentityState {
  lotno_dough: string;
  lotno_finish_good: string;
  product_code: string;
  tanggal_lotno: string;
  active_pro: string;
}

const initialState: ProdidentityState = {
  lotno_dough: '',
  lotno_finish_good: '',
  product_code: '',
  tanggal_lotno: '',
  active_pro: '',
};

export const ProdidentityReducer = createReducer(
  initialState,
  on(
    setProdidentity,
    (
      state,
      {
        lotno_dough,
        lotno_finish_good,
        product_code,
        tanggal_lotno,
        active_pro,
      }
    ) => ({
      ...state,
      lotno_dough,
      lotno_finish_good,
      product_code,
      tanggal_lotno,
      active_pro,
    })
  )
);
