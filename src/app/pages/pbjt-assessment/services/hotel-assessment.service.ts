import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { HotelAssessmentResponse, DashboardMetrics } from '../models/hotel-assessment.model';
import { AccommodationType } from '../models/accommodation.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HotelAssessmentService {
  private apiUrl = `${environment.apiUrl}api/hotel-accommodations`;

  constructor(private http: HttpClient) {}

  getAssessment(id: string): Observable<HotelAssessmentResponse> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data as HotelAssessmentResponse),
      catchError(() => of({} as HotelAssessmentResponse))
    );
  }

  getAssessments(filters?: any): Observable<HotelAssessmentResponse[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map(response => response.data || []),
      catchError(() => of([]))
    );
  }

  /**
   * Get dashboard metrics from backend (real data from SIMATDA-synced local DB)
   */
  getDashboardMetrics(): Observable<DashboardMetrics> {
    return this.http.get<any>(`${this.apiUrl}/dashboard`).pipe(
      map(response => {
        const data = response.data || {};
        const yearlyStats = data.yearlyStats || [];
        const byType = data.byType || [];

        // Build byType map
        const typeMap: any = {
          HOTEL: 0, WISMA: 0, HOMESTAY: 0, PENGINAPAN: 0, RUMAH_KOS: 0
        };
        byType.forEach((t: any) => {
          typeMap[t.accommodation_type] = t.count;
        });

        // Get current and previous year stats
        const currentYearData = yearlyStats.find((s: any) => s.year === '2025') || {};
        const prevYearData = yearlyStats.find((s: any) => s.year === '2024') || {};
        const currentRevenue = Number(currentYearData.total_revenue || 0);
        const currentTax = Number(currentYearData.total_tax || 0);
        const prevTax = Number(prevYearData.total_tax || 0);
        const growth = prevTax > 0 ? (currentTax - prevTax) / prevTax : 0;

        // Formalization stats
        const formalization = data.formalization || [];
        const formalCount = formalization.find((f: any) => f.formalization_status === 'FORMAL')?.count || 0;
        const informalCount = formalization.find((f: any) => f.formalization_status === 'INFORMAL')?.count || 0;
        const semiFormalCount = formalization.find((f: any) => f.formalization_status === 'SEMI_FORMAL')?.count || 0;
        const totalForCalc = formalCount + informalCount + semiFormalCount || 1;

        // Build monthly trend from latest year
        const latestYear = yearlyStats.length > 0 ? yearlyStats[yearlyStats.length - 1] : null;
        const labels = yearlyStats.map((s: any) => s.year);
        const revenueArr = yearlyStats.map((s: any) => Number(s.total_revenue || 0));
        const taxArr = yearlyStats.map((s: any) => Number(s.total_tax || 0));

        const metrics: DashboardMetrics = {
          totalProperties: data.totalProperties || 0,
          byType: typeMap,
          revenue: {
            current: currentRevenue,
            projected: currentRevenue * 1.1,
            potential: currentRevenue * 1.3,
            growth: growth
          },
          tax: {
            collected: currentTax,
            projected: currentTax * 1.1,
            potential: currentTax * 1.3,
            gap: (currentTax * 1.3) - currentTax,
            collectionRate: currentTax / (currentTax * 1.3 || 1)
          },
          formalization: {
            formal: formalCount,
            informal: informalCount + semiFormalCount,
            rate: formalCount / totalForCalc
          },
          recentAssessments: data.totalProperties || 0,
          pendingApprovals: 0,
          trends: {
            labels,
            revenue: revenueArr,
            tax: taxArr
          }
        };
        return metrics;
      }),
      catchError(err => {
        console.error('Error fetching dashboard metrics:', err);
        // Return empty metrics on error
        return of({
          totalProperties: 0,
          byType: { HOTEL: 0, WISMA: 0, HOMESTAY: 0, PENGINAPAN: 0, RUMAH_KOS: 0 },
          revenue: { current: 0, projected: 0, potential: 0, growth: 0 },
          tax: { collected: 0, projected: 0, potential: 0, gap: 0, collectionRate: 0 },
          formalization: { formal: 0, informal: 0, rate: 0 },
          recentAssessments: 0,
          pendingApprovals: 0,
          trends: { labels: [], revenue: [], tax: [] }
        } as DashboardMetrics);
      })
    );
  }

  /**
   * Get revenue trends from backend yearly stats
   */
  getRevenueTrends(period: 'monthly' | 'quarterly' | 'yearly', type?: AccommodationType): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/dashboard`).pipe(
      map(response => {
        const yearlyStats = response.data?.yearlyStats || [];
        return {
          labels: yearlyStats.map((s: any) => s.year),
          revenue: yearlyStats.map((s: any) => Number(s.total_revenue || 0)),
          tax: yearlyStats.map((s: any) => Number(s.total_tax || 0))
        };
      }),
      catchError(() => of({
        labels: [],
        revenue: [],
        tax: []
      }))
    );
  }
}
