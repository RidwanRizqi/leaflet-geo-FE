import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DashboardSummary, TargetRealisasi, TrendBulanan, TopKontributor } from '../models/pendapatan.model';

// API Response wrapper interface
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  totalCount?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PendapatanService {
  private apiUrl = `${environment.apiUrl}api/pendapatan`;

  constructor(private http: HttpClient) { }

  getDashboardSummary(tahun: number = 2025): Observable<DashboardSummary> {
    const params = new HttpParams().set('tahun', tahun.toString());
    return this.http.get<ApiResponse<DashboardSummary>>(`${this.apiUrl}/summary`, { params })
      .pipe(map(response => response.data));
  }

  getTargetRealisasi(tahun: number = 2025): Observable<TargetRealisasi[]> {
    const params = new HttpParams().set('tahun', tahun.toString());
    return this.http.get<ApiResponse<TargetRealisasi[]>>(`${this.apiUrl}/target-realisasi`, { params })
      .pipe(map(response => response.data || []));
  }

  getTrendBulanan(tahun: number = 2025): Observable<TrendBulanan[]> {
    const params = new HttpParams().set('tahun', tahun.toString());
    return this.http.get<ApiResponse<TrendBulanan[]>>(`${this.apiUrl}/trend-bulanan`, { params })
      .pipe(map(response => response.data || []));
  }

  getTopKontributor(tahun: number = 2025, limit: number = 10): Observable<TopKontributor[]> {
    const params = new HttpParams()
      .set('tahun', tahun.toString())
      .set('limit', limit.toString());
    return this.http.get<ApiResponse<TopKontributor[]>>(`${this.apiUrl}/top-kontributor`, { params })
      .pipe(map(response => response.data || []));
  }

  getRealisasiByJenis(tahun: number = 2025, jenisPajakId?: string): Observable<any[]> {
    let params = new HttpParams().set('tahun', tahun.toString());
    if (jenisPajakId) {
      params = params.set('jenisPajakId', jenisPajakId);
    }
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/realisasi-by-jenis`, { params })
      .pipe(map(response => response.data || []));
  }
}
