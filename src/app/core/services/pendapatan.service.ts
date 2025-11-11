import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DashboardSummary, TargetRealisasi, TrendBulanan, TopKontributor } from '../models/pendapatan.model';

@Injectable({
  providedIn: 'root'
})
export class PendapatanService {
  private apiUrl = `${environment.apiUrl}api/pendapatan`;

  constructor(private http: HttpClient) { }

  getDashboardSummary(tahun: number = 2025): Observable<DashboardSummary> {
    const params = new HttpParams().set('tahun', tahun.toString());
    return this.http.get<DashboardSummary>(`${this.apiUrl}/summary`, { params });
  }

  getTargetRealisasi(tahun: number = 2025): Observable<TargetRealisasi[]> {
    const params = new HttpParams().set('tahun', tahun.toString());
    return this.http.get<TargetRealisasi[]>(`${this.apiUrl}/target-realisasi`, { params });
  }

  getTrendBulanan(tahun: number = 2025): Observable<TrendBulanan[]> {
    const params = new HttpParams().set('tahun', tahun.toString());
    return this.http.get<TrendBulanan[]>(`${this.apiUrl}/trend-bulanan`, { params });
  }

  getTopKontributor(tahun: number = 2025, limit: number = 10): Observable<TopKontributor[]> {
    const params = new HttpParams()
      .set('tahun', tahun.toString())
      .set('limit', limit.toString());
    return this.http.get<TopKontributor[]>(`${this.apiUrl}/top-kontributor`, { params });
  }

  getRealisasiByJenis(tahun: number = 2025, jenisPajakId?: string): Observable<any[]> {
    let params = new HttpParams().set('tahun', tahun.toString());
    if (jenisPajakId) {
      params = params.set('jenisPajakId', jenisPajakId);
    }
    return this.http.get<any[]>(`${this.apiUrl}/realisasi-by-jenis`, { params });
  }
}
