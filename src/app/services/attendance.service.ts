import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/auth.models';
import {
  Attendance,
  AttendanceCheckInRequest,
  AttendanceCheckOutRequest,
  AttendanceStatusToday,
  AttendanceSummary,
  AttendanceUserLocation
} from '../models/attendance.model';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = environment.apiUrl + 'api/attendance';

  constructor(private http: HttpClient) {}

  /**
   * Absen Masuk (Check-In)
   * POST /api/attendance/check-in
   */
  checkIn(request: AttendanceCheckInRequest): Observable<ApiResponse<Attendance>> {
    return this.http.post<ApiResponse<Attendance>>(`${this.apiUrl}/check-in`, request);
  }

  /**
   * Absen Pulang (Check-Out)
   * POST /api/attendance/check-out
   */
  checkOut(request: AttendanceCheckOutRequest): Observable<ApiResponse<Attendance>> {
    return this.http.post<ApiResponse<Attendance>>(`${this.apiUrl}/check-out`, request);
  }

  /**
   * Ambil status absensi hari ini milik user login
   * GET /api/attendance/today
   */
  getTodayStatus(): Observable<ApiResponse<AttendanceStatusToday>> {
    return this.http.get<ApiResponse<AttendanceStatusToday>>(`${this.apiUrl}/today`);
  }

  /**
   * Ambil riwayat absensi user login
   * GET /api/attendance/history
   */
  getMyHistory(startDate?: string, endDate?: string): Observable<ApiResponse<Attendance[]>> {
    let params = new HttpParams();
    if (startDate) params = params.set('start', startDate);
    if (endDate) params = params.set('end', endDate);

    return this.http.get<ApiResponse<Attendance[]>>(`${this.apiUrl}/history`, { params });
  }

  /**
   * Ambil list kehadiran semua user (Admin Only)
   * GET /api/attendance/admin/list
   */
  getAdminList(tanggal?: string, role?: string): Observable<ApiResponse<Attendance[]>> {
    let params = new HttpParams();
    if (tanggal && tanggal.trim() !== '') params = params.set('tanggal', tanggal.trim());
    if (role && role.trim() !== '') params = params.set('role', role.trim());

    return this.http.get<ApiResponse<Attendance[]>>(`${this.apiUrl}/admin/list`, { params });
  }

  /**
   * Ambil summary statistik kehadiran (Admin Only)
   * GET /api/attendance/admin/summary
   */
  getAdminSummary(tanggal?: string): Observable<ApiResponse<AttendanceSummary>> {
    let params = new HttpParams();
    if (tanggal && tanggal.trim() !== '') params = params.set('tanggal', tanggal.trim());

    return this.http.get<ApiResponse<AttendanceSummary>>(`${this.apiUrl}/admin/summary`, { params });
  }

  /**
   * Ambil data marker lokasi semua user (Admin Only)
   * GET /api/attendance/admin/locations
   */
  getAdminLocations(tanggal?: string): Observable<ApiResponse<AttendanceUserLocation[]>> {
    let params = new HttpParams();
    if (tanggal && tanggal.trim() !== '') params = params.set('tanggal', tanggal.trim());

    return this.http.get<ApiResponse<AttendanceUserLocation[]>>(`${this.apiUrl}/admin/locations`, { params });
  }

  /**
   * URL endpoint untuk view foto selfie
   */
  getPhotoUrl(filename: string): string {
    if (!filename) return '';
    if (filename.startsWith('http://') || filename.startsWith('https://')) {
      return filename;
    }
    return `${this.apiUrl}/photo/${filename}`;
  }
}
