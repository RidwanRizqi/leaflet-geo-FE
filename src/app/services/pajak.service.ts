import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Data format matching master-pajak.json structure
export interface PajakData {
    kategori: string;
    tahun: number;
    bulan: string;
    value: number;
}

// API Response wrapper
interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
    totalCount?: number;
}

@Injectable({
    providedIn: 'root'
})
export class PajakService {
    private apiUrl = `${environment.apiUrl}api/pendapatan`;

    constructor(private http: HttpClient) { }

    /**
     * Get pajak data bulanan per kategori
     * Same format as master-pajak.json
     */
    getPajakBulanan(tahun: number = 2025): Observable<PajakData[]> {
        const params = new HttpParams().set('tahun', tahun.toString());
        return this.http.get<ApiResponse<PajakData[]>>(`${this.apiUrl}/pajak-bulanan`, { params })
            .pipe(map(response => response.data || []));
    }
}
