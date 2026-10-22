import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PbjtPotensi, PotensiListResponse, MasterMenu, PotensiObservation } from '../models/potensi.model';

@Injectable({
  providedIn: 'root'
})
export class PbjtPotensiService {
  private baseUrl = `${environment.apiUrl ? environment.apiUrl.replace(/\/+$/, '') : ''}/api/pbjt-potensi`;
  private masterMenuUrl = `${environment.apiUrl ? environment.apiUrl.replace(/\/+$/, '') : ''}/api/pbjt-master-menus`;

  constructor(private http: HttpClient) {}

  /**
   * Mengambil daftar potensi dengan pagination dan pencarian (bisa filter surveyorId)
   */
  getPotensiList(page: number = 0, size: number = 10, search: string = '', surveyorId?: string): Observable<PotensiListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (search && search.trim() !== '') {
      params = params.set('search', search.trim());
    }

    if (surveyorId && surveyorId.trim() !== '') {
      params = params.set('surveyorId', surveyorId.trim());
    }

    return this.http.get<PotensiListResponse>(this.baseUrl, { params });
  }

  /**
   * Mengambil data potensi berdasarkan ID
   */
  getPotensiById(id: number): Observable<{ success: boolean; data: PbjtPotensi; message?: string }> {
    return this.http.get<{ success: boolean; data: PbjtPotensi; message?: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Generate kode potensi baru
   */
  getGeneratedKode(date?: string): Observable<{ success: boolean; kodePotensi: string }> {
    let params = new HttpParams();
    if (date) {
      params = params.set('date', date);
    }
    return this.http.get<{ success: boolean; kodePotensi: string }>(`${this.baseUrl}/generate-kode`, { params });
  }

  /**
   * Mengambil data potensi untuk export (dengan filter tanggal atau cetak semua)
   */
  getPotensiForExport(startDate?: string, endDate?: string, surveyorId?: string): Observable<{ success: boolean; data: PbjtPotensi[]; total: number }> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    if (surveyorId && surveyorId.trim() !== '') {
      params = params.set('surveyorId', surveyorId.trim());
    }
    return this.http.get<{ success: boolean; data: PbjtPotensi[]; total: number }>(`${this.baseUrl}/export`, { params });
  }

  /**
   * Membuat data potensi baru
   */
  createPotensi(potensi: PbjtPotensi, username?: string): Observable<{ success: boolean; data: PbjtPotensi; message: string }> {
    let headers = new HttpHeaders();
    if (username) {
      headers = headers.set('X-User-Name', username);
    }
    return this.http.post<{ success: boolean; data: PbjtPotensi; message: string }>(this.baseUrl, potensi, { headers });
  }

  /**
   * Memperbarui data potensi
   */
  updatePotensi(id: number, potensi: PbjtPotensi, username?: string): Observable<{ success: boolean; data: PbjtPotensi; message: string }> {
    let headers = new HttpHeaders();
    if (username) {
      headers = headers.set('X-User-Name', username);
    }
    return this.http.put<{ success: boolean; data: PbjtPotensi; message: string }>(`${this.baseUrl}/${id}`, potensi, { headers });
  }

  /**
   * Menghapus data potensi
   */
  deletePotensi(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Mengambil master menu untuk autocomplete/pilihan
   */
  getMasterMenus(search?: string): Observable<{ success: boolean; data: MasterMenu[]; total: number }> {
    let params = new HttpParams();
    if (search && search.trim() !== '') {
      params = params.set('search', search.trim());
    }
    return this.http.get<{ success: boolean; data: MasterMenu[]; total: number }>(this.masterMenuUrl, { params });
  }

  /**
   * Menyimpan master menu baru
   */
  saveMasterMenu(menu: MasterMenu): Observable<{ success: boolean; data: MasterMenu; message: string }> {
    return this.http.post<{ success: boolean; data: MasterMenu; message: string }>(this.masterMenuUrl, menu);
  }

  /**
   * Menghapus seluruh master menu (clear history)
   */
  clearMasterMenus(): Observable<{ success: boolean; message: string; deleted: number }> {
    return this.http.delete<{ success: boolean; message: string; deleted: number }>(this.masterMenuUrl);
  }

  /**
   * Mengambil daftar menu yang sudah pernah diinput berdasarkan nama usaha yang sama
   */
  getMenusByName(name: string): Observable<{ success: boolean; found: boolean; source?: string; businessName?: string; menuItems?: any[] }> {
    const params = new HttpParams().set('name', name);
    return this.http.get<{ success: boolean; found: boolean; source?: string; businessName?: string; menuItems?: any[] }>(
      `${this.baseUrl}/menus-by-name`,
      { params }
    );
  }

  /**
   * Mengambil semua nama usaha yang sudah ada untuk autocomplete datalist
   */
  getBusinessNames(): Observable<{ success: boolean; data: string[] }> {
    return this.http.get<{ success: boolean; data: string[] }>(`${this.baseUrl}/business-names`);
  }

  /**
   * Mengambil riwayat observasi untuk suatu data potensi
   */
  getObservations(potensiId: number): Observable<{ success: boolean; data: PotensiObservation[]; total: number }> {
    return this.http.get<{ success: boolean; data: PotensiObservation[]; total: number }>(`${this.baseUrl}/${potensiId}/observations`);
  }

  /**
   * Menambahkan data observasi baru untuk potensi
   */
  addObservation(potensiId: number, obs: PotensiObservation, username?: string): Observable<{ success: boolean; data: PotensiObservation; message: string }> {
    let headers = new HttpHeaders();
    if (username) {
      headers = headers.set('X-User-Name', username);
    }
    return this.http.post<{ success: boolean; data: PotensiObservation; message: string }>(
      `${this.baseUrl}/${potensiId}/observations`,
      obs,
      { headers }
    );
  }

  /**
   * Menghapus observasi potensi berdasarkan ID
   */
  deleteObservation(obsId: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.baseUrl}/observations/${obsId}`);
  }

  /**
   * Upload foto potensi/lokasi (maksimal 8 foto)
   */
  uploadImages(files: File[]): Observable<{ success: boolean; urls: string[]; message?: string }> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    const assessmentUrl = `${environment.apiUrl ? environment.apiUrl.replace(/\/+$/, '') : ''}/api/pbjt-assessment`;
    return this.http.post<{ success: boolean; urls: string[]; message?: string }>(`${assessmentUrl}/upload-images`, formData);
  }
}

