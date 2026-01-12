/* eslint-disable @typescript-eslint/adjacent-overload-signatures */
import { Injectable, PipeTransform } from '@angular/core';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { DecimalPipe } from '@angular/common';
import { debounceTime, delay, switchMap, tap } from 'rxjs/operators';
import { SortColumn, SortDirection } from '../directives/listjs.directive';

interface SearchResult {
  datas: any[];
  total: number;
}

interface State {
  page: number;
  pageSize: number;
  searchTerm: string;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  startIndex: number;
  endIndex: number;
  totalRecords: number;
  isServerSide: boolean;
}

const compare = (v1: string | number, v2: string | number) => (v1 < v2 ? -1 : v1 > v2 ? 1 : 0);

function sort(datas: any[], column: SortColumn, direction: string): any[] {
  if (direction === '' || column === '') {
    return datas;
  } else {
    return [...datas].sort((a, b) => {
      const res = compare(a[column], b[column]);
      return direction === 'asc' ? res : -res;
    });
  }
}

function matches(data: any, term: string, pipe: PipeTransform): boolean {
  return Object.keys(data).some(property => {
    const value = data[property];
    return typeof value === 'string' && value.toLowerCase().includes(term.toLowerCase());
  });
}

@Injectable({ providedIn: 'root' })
export class ListjsService {
  private _loading$ = new BehaviorSubject<boolean>(true);
  private _search$ = new Subject<void>();
  private _datas$ = new BehaviorSubject<any[]>([]);
  private _total$ = new BehaviorSubject<number>(0);

  private _data$ = new BehaviorSubject<any[]>([]);

  setData(data$: any[]): void {
    this._data$.next(data$);
  }

  private _state: State = {
    page: 1,
    pageSize: 8,
    searchTerm: '',
    sortColumn: '',
    sortDirection: '',
    startIndex: 0,
    endIndex: 9,
    totalRecords: 0,
    isServerSide: false,
  };

  constructor(private pipe: DecimalPipe) {
    this._search$
      .pipe(
        tap(() => this._loading$.next(true)),
        debounceTime(200),
        switchMap(() => this._search()),
        delay(200),
        tap(() => this._loading$.next(false))
      )
      .subscribe(result => {
        this._datas$.next(result.datas);
        this._total$.next(result.total);
      });

    this._search$.next();
  }

  get datas$() {
    return this._datas$.asObservable();
  }
  get total$() {
    return this._total$.asObservable();
  }
  get loading$() {
    return this._loading$.asObservable();
  }
  get page() {
    return this._state.page;
  }
  get pageSize() {
    return this._state.pageSize;
  }
  get searchTerm() {
    return this._state.searchTerm;
  }
  get startIndex() {
    return this._state.startIndex;
  }
  get endIndex() {
    return this._state.endIndex;
  }
  get totalRecords() {
    return this._state.totalRecords;
  }
  get isServerSide() {
    return this._state.isServerSide;
  }

  set page(page: number) {
    this._set({ page });
  }
  set pageSize(pageSize: number) {
    this._set({ pageSize });
  }
  set searchTerm(searchTerm: string) {
    this._set({ searchTerm });
  }
  set sortColumn(sortColumn: SortColumn) {
    this._set({ sortColumn });
  }
  set sortDirection(sortDirection: SortDirection) {
    this._set({ sortDirection });
  }
  set startIndex(startIndex: number) {
    this._set({ startIndex });
  }
  set endIndex(endIndex: number) {
    this._set({ endIndex });
  }
  set totalRecords(totalRecords: number) {
    this._set({ totalRecords });
  }
  set isServerSide(isServerSide: boolean) {
    this._set({ isServerSide });
  }

  private _set(patch: Partial<State>) {
    Object.assign(this._state, patch);
    this._search$.next();
  }

  private _search(): Observable<SearchResult> {
    const { sortColumn, sortDirection, pageSize, page, searchTerm } = this._state;

    let datas = sort(this._data$.value, sortColumn, sortDirection);

    datas = datas.filter(data => matches(data, searchTerm, this.pipe));
    const total = datas.length;

    if (!this.isServerSide) {
      this.totalRecords = datas.length;
      this._state.startIndex = (page - 1) * this.pageSize + 1;
      this._state.endIndex = (page - 1) * this.pageSize + this.pageSize;
      if (this.endIndex > this.totalRecords) {
        this.endIndex = this.totalRecords;
      }
      datas = datas.slice(this._state.startIndex - 1, this._state.endIndex);
    } else {
      // Server-side logic: Fetch the required data for the current page from the server
      // Example server-side logic (replace with actual server-side fetching logic):
      // datas = this.fetchDataFromServer(page, pageSize);
      // this.totalRecords = datas.length;
      this._state.startIndex = (page - 1) * this.pageSize + 1;
      this._state.endIndex = (page - 1) * this.pageSize + this.pageSize;
      if (this.endIndex > this.totalRecords) {
        this.endIndex = this.totalRecords;
      }
    }

    return of({ datas, total });
  }

  // Example server-side fetching logic (to be implemented):
  // private fetchDataFromServer(page: number, pageSize: number): any[] {
  //   // Fetch data from server based on page and pageSize
  //   return [];
  // }
}
