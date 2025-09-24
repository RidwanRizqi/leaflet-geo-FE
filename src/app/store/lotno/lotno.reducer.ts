import { createReducer, on } from '@ngrx/store';
import { setLotno, clearLotno } from './lotno.action';

export interface LotnoState {
    lotno: string; // Global user for the shell
}

const initialState: LotnoState = {
    lotno: ''
};

export const LotnoReducer = createReducer(
    initialState,
    on(setLotno, (state, { lotno }) => ({
        ...state,
        lotno
    })),
    on(clearLotno, (state) => ({
        ...state,
        lotno: '',
    }))
);
