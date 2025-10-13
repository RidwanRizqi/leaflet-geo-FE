import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, switchMap } from 'rxjs';
import { RestApiService } from './rest-api.service';

export interface BprdLoginResponse {
  message: string;
  user: {
    nama: string;
    id_unit: string | null;
    role: string;
    token: string;
  };
}

export interface KecamatanBoundary {
  id: string;
  kd_kec: string;
  nama: string;
  color: string;
  geojson: any;  // GeoJSON geometry object (already converted from WKB in backend)
  is_active: boolean;
}

export interface KelurahanBoundary {
  id: string;
  kd_kec: string;
  kd_kel: string;
  nama: string;
  geom: string;  // WKB hex string (will be converted to GeoJSON)
  geometry?: string; // GeoJSON string (converted from WKB by backend)
  jumlah_bidang?: number; // Count of bidang from local database
  is_active: boolean;
}

export interface BlokBoundary {
  id: string;
  kd_kec: string;
  kd_kel: string;
  kd_blok: string;
  geom: string;  // WKB hex string (will be converted to GeoJSON)
  is_active: boolean;
}

export interface BidangBoundary {
  id: string;
  kd_prop: string;
  kd_dati2: string;
  kd_kec: string;
  kd_kel: string;
  kd_blok: string;
  no_urut: string;
  kd_jns_op: string;
  nop: string;
  geom: string;  // WKB hex string (will be converted to GeoJSON)
  is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class BprdApiService {
  private readonly BPRD_BASE_URL = 'https://bprd.lumajangkab.go.id:1151/api';
  private tokenSubject = new BehaviorSubject<string | null>(null);
  public token$ = this.tokenSubject.asObservable();

  constructor(
    private http: HttpClient,
    private restApiService: RestApiService
  ) {
    // Load token from localStorage on service init
    const storedToken = localStorage.getItem('bprd_token');
    if (storedToken) {
      this.tokenSubject.next(storedToken);
    }
  }

  /**
   * Login to BPRD API and get authentication token
   */
  login(username: string = 'user', password: string = 'user'): Observable<BprdLoginResponse> {
    const loginUrl = `${this.BPRD_BASE_URL}/user/login`;
    const credentials = { username, password };

    return this.http.post<BprdLoginResponse>(loginUrl, credentials).pipe(
      tap(response => {
        if (response.user && response.user.token) {
          // Store token in memory and localStorage
          this.tokenSubject.next(response.user.token);
          localStorage.setItem('bprd_token', response.user.token);
          console.log('✅ BPRD Login successful, token stored');
        }
      })
    );
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.tokenSubject.value;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Get HTTP headers with Bearer token
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    if (!token) {
      throw new Error('No authentication token available. Please login first.');
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Get all kecamatan boundaries from BPRD API
   */
  getKecamatanBoundaries(): Observable<KecamatanBoundary[]> {
    const url = `${this.BPRD_BASE_URL}/kecamatan/list?option=false`;
    const headers = this.getAuthHeaders();

    return this.http.get<KecamatanBoundary[]>(url, { headers });
  }

  /**
   * Auto-login and get boundaries if not authenticated (via backend proxy)
   */
  ensureAuthAndGetBoundaries(): Observable<KecamatanBoundary[]> {
    // Use backend proxy to avoid CORS issues
    return this.getBoundariesViaBackend();
  }

  /**
   * Get boundaries via backend proxy (no CORS issues)
   */
  getBoundariesViaBackend(): Observable<KecamatanBoundary[]> {
    // Use simple backend endpoint that handles login + fetch
    const proxyUrl = this.restApiService.apiUrl + 'bprd/boundaries';

    console.log('🌐 Fetching boundaries via simple backend endpoint:', proxyUrl);

    return this.http.get<KecamatanBoundary[]>(proxyUrl).pipe(
      tap(boundaries => {
        console.log('✅ Received boundaries via backend:', boundaries.length);
      })
    );
  }

  /**
   * Get kelurahan boundaries for a specific kecamatan via backend proxy
   */
  getKelurahanBoundariesViaBackend(kdKec: string): Observable<KelurahanBoundary[]> {
    const proxyUrl = this.restApiService.apiUrl + `bprd/kelurahan?kd_kec=${kdKec}`;

    console.log('🌐 Fetching kelurahan boundaries via backend endpoint:', proxyUrl);

    return this.http.get<KelurahanBoundary[]>(proxyUrl).pipe(
      tap(boundaries => {
        console.log(`✅ Received ${boundaries.length} kelurahan boundaries for kecamatan ${kdKec}`);
      })
    );
  }

  /**
   * Test BPRD connection via backend proxy
   */
  testBprdConnection(): Observable<any> {
    const testUrl = this.restApiService.apiUrl + 'bprd/test';
    return this.http.get<any>(testUrl);
  }

  /**
   * Check BPRD auth status
   */
  checkAuthStatus(): Observable<any> {
    const statusUrl = this.restApiService.apiUrl + 'bprd/status';
    return this.http.get<any>(statusUrl);
  }

  /**
   * Logout and clear token
   */
  logout(): void {
    this.tokenSubject.next(null);
    localStorage.removeItem('bprd_token');
    console.log('🚪 Logged out from BPRD API');
  }

  /**
   * Transform BPRD boundary data to GeoJSON FeatureCollection for Leaflet
   * Backend already converts WKB to GeoJSON, so we just need to structure it properly
   */
  transformToGeoJSON(boundaries: KecamatanBoundary[]): any {
    const features = boundaries
      .filter(boundary => boundary.is_active && boundary.geojson)
      .map(boundary => {
        return {
          type: 'Feature',
          properties: {
            id: boundary.id,
            kd_kec: boundary.kd_kec,
            nama: boundary.nama,
            color: boundary.color,
            is_active: boundary.is_active
          },
          geometry: boundary.geojson  // Already GeoJSON from backend
        };
      });

    return {
      type: 'FeatureCollection',
      features: features
    };
  }

  /**
   * Get blok boundaries for specific kecamatan and kelurahan via backend proxy
   * Backend handles BPRD authentication and WKB to GeoJSON conversion
   */
  getBlokBoundariesViaBackend(kdKec: string, kdKel: string): Observable<BlokBoundary[]> {
    const proxyUrl = this.restApiService.apiUrl + `bprd/blok?kd_kec=${kdKec}&kd_kel=${kdKel}`;
    console.log(`🏗️ Getting blok boundaries via backend proxy: ${proxyUrl}`);
    return this.http.get<BlokBoundary[]>(proxyUrl);
  }

  /**
   * Get bidang boundaries for specific kecamatan, kelurahan, and blok via backend proxy
   * Backend handles BPRD authentication and WKB to GeoJSON conversion
   */
  getBidangBoundariesViaBackend(kdKec: string, kdKel: string, kdBlok: string): Observable<BidangBoundary[]> {
    const proxyUrl = this.restApiService.apiUrl + `bprd/bidang?kd_kec=${kdKec}&kd_kel=${kdKel}&kd_blok=${kdBlok}`;
    console.log(`📦 Getting bidang boundaries via backend proxy: ${proxyUrl}`);
    return this.http.get<BidangBoundary[]>(proxyUrl);
  }

  /**
   * Get bidang detail (infonop) from BPRD API via backend proxy
   */
  getBidangDetail(id: string, kdProp: string, kdDati2: string, kdKec: string, kdKel: string, kdBlok: string, noUrut: string, kdJnsOp: string): Observable<any> {
    const proxyUrl = this.restApiService.apiUrl + `bprd/infonop?id=${id}&kd_prop=${kdProp}&kd_dati2=${kdDati2}&kd_kec=${kdKec}&kd_kel=${kdKel}&kd_blok=${kdBlok}&no_urut=${noUrut}&kd_jns_op=${kdJnsOp}`;
    console.log(`🏠 Getting bidang detail via backend proxy: ${proxyUrl}`);
    return this.http.get<any>(proxyUrl);
  }

  /**
   * Get tematik data from BPRD API via backend proxy
   */
  getTematikData(tematikRequest: any): Observable<any> {
    const proxyUrl = this.restApiService.apiUrl + 'bprd/tematik';
    console.log(`🎨 Getting tematik data via backend proxy: ${proxyUrl}`, tematikRequest);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(proxyUrl, tematikRequest, { headers });
  }


}
