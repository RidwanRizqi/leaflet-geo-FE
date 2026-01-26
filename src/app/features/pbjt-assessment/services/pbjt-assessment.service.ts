import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Assessment, AssessmentListResponse, AssessmentDetailResponse, AssessmentRequest } from '../models/assessment.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PbjtAssessmentService {
  private apiUrl = `${environment.apiUrl}api/pbjt-assessments`;

  constructor(private http: HttpClient) { }

  /**
   * Get all assessments with pagination
   */
  getAllAssessments(page: number = 0, size: number = 10): Observable<AssessmentListResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<AssessmentListResponse>(this.apiUrl, { params });
  }

  /**
   * Get assessment by ID
   */
  getAssessmentById(id: number): Observable<AssessmentDetailResponse> {
    return this.http.get<AssessmentDetailResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get assessment by business ID
   */
  getAssessmentByBusinessId(businessId: string): Observable<AssessmentDetailResponse> {
    return this.http.get<AssessmentDetailResponse>(`${this.apiUrl}/business/${businessId}`);
  }

  /**
   * Get assessments by kabupaten
   */
  getAssessmentsByKabupaten(kabupaten: string): Observable<AssessmentListResponse> {
    return this.http.get<AssessmentListResponse>(`${this.apiUrl}/kabupaten/${kabupaten}`);
  }

  /**
   * Get assessments by kecamatan
   */
  getAssessmentsByKecamatan(kecamatan: string): Observable<AssessmentListResponse> {
    return this.http.get<AssessmentListResponse>(`${this.apiUrl}/kecamatan/${kecamatan}`);
  }

  /**
   * Create new assessment
   */
  createAssessment(assessment: AssessmentRequest): Observable<AssessmentDetailResponse> {
    return this.http.post<AssessmentDetailResponse>(this.apiUrl, assessment);
  }

  /**
   * Update existing assessment
   */
  updateAssessment(id: number, assessment: AssessmentRequest): Observable<AssessmentDetailResponse> {
    return this.http.put<AssessmentDetailResponse>(`${this.apiUrl}/${id}`, assessment);
  }

  /**
   * Delete assessment
   */
  deleteAssessment(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Upload business images (max 4 images)
   */
  uploadImages(files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post(`${this.apiUrl}/upload-images`, formData);
  }

  /**
   * Get total count
   */
  getCount(): Observable<any> {
    return this.http.get(`${this.apiUrl}/count`);
  }

  /**
   * Get assessments with SIMATDA realization data
   */
  getAssessmentsWithRealization(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}api/pbjt-realization`);
  }

  /**
   * Health check
   */
  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  /**
   * Format currency for display
   */
  formatCurrency(value: number | undefined): string {
    if (!value) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  /**
   * Format number with separators
   */
  formatNumber(value: number | undefined): string {
    if (!value) return '0';
    return new Intl.NumberFormat('id-ID').format(value);
  }

  /**
   * Get confidence level badge class
   */
  getConfidenceBadgeClass(level: string): string {
    switch (level) {
      case 'HIGH':
        return 'badge bg-success';
      case 'MEDIUM':
        return 'badge bg-warning';
      case 'LOW':
        return 'badge bg-danger';
      default:
        return 'badge bg-secondary';
    }
  }

  /**
   * Get business type display name
   */
  getBusinessTypeDisplayName(type: string): string {
    const names: any = {
      'WARUNG_KECIL': 'Warung Kecil',
      'RUMAH_MAKAN': 'Rumah Makan',
      'RESTAURANT': 'Restaurant',
      'CAFE_MODERN': 'Café Modern',
      'FRANCHISE': 'Franchise'
    };
    return names[type] || type;
  }

  /**
   * Get day type display name
   */
  getDayTypeDisplayName(type: string): string {
    const names: any = {
      'WEEKDAY_PEAK': 'Weekday Peak',
      'WEEKDAY_OFFPEAK': 'Weekday Off-Peak',
      'WEEKEND_PEAK': 'Weekend Peak',
      'HOLIDAY': 'Holiday'
    };
    return names[type] || type;
  }

  /**
   * Get statistics by kecamatan (for map view)
   */
  getStatsByKecamatan(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stats/by-kecamatan`);
  }

  /**
   * Get statistics by kelurahan for specific kecamatan (for map view)
   */
  getStatsByKelurahan(kecamatan: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/stats/by-kelurahan/${kecamatan}`);
  }

  /**
   * Get assessments by location (kecamatan and kelurahan)
   */
  getAssessmentsByLocation(kecamatan: string, kelurahan: string): Observable<any[]> {
    const params = new HttpParams()
      .set('kecamatan', kecamatan)
      .set('kelurahan', kelurahan);
    return this.http.get<any[]>(`${this.apiUrl}/by-location`, { params });
  }

  /**
   * Get assessments by location WITH realization data from SIMATDA
   */
  getAssessmentsByLocationWithRealization(kecamatan: string, kelurahan: string): Observable<any[]> {
    const params = new HttpParams()
      .set('kecamatan', kecamatan)
      .set('kelurahan', kelurahan);
    return this.http.get<any[]>(`${environment.apiUrl}api/pbjt-realization/by-location`, { params });
  }
}
