import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BidangData {
  id: string;
  nop: string;
  geom: string;
  kd_prop: string;
  kd_dati2: string;
  kd_kec: string;
  kd_kel: string;
  kd_blok: string;
  no_urut: string;
  kd_jns_op: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface PaginationInfo {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface BidangResponse {
  data: BidangData[];
  pagination: PaginationInfo;
}

export interface HealthResponse {
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class BidangService {
  private baseUrl = environment.apiUrl + '/api/bidang';

  constructor(private http: HttpClient) { }

  /**
   * Health check endpoint
   */
  checkHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.baseUrl}/health`);
  }

  /**
   * Get all bidang data with pagination
   */
  getAllBidang(page: number = 0, size: number = 10): Observable<BidangResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<BidangResponse>(`${this.baseUrl}`, { params });
  }

  /**
   * Get bidang data with geometry for mapping
   */
  getBidangGeometry(page: number = 0, size: number = 50): Observable<BidangResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<BidangResponse>(`${this.baseUrl}/geometry`, { params });
  }

  /**
   * Get bidang by ID
   */
  getBidangById(id: string): Observable<BidangData> {
    return this.http.get<BidangData>(`${this.baseUrl}/${id}`);
  }

  /**
   * Get bidang by NOP
   */
  getBidangByNop(nop: string): Observable<BidangData> {
    return this.http.get<BidangData>(`${this.baseUrl}/nop/${nop}`);
  }

  /**
   * Get bidang by province code
   */
  getBidangByProvince(kdProp: string): Observable<BidangData[]> {
    return this.http.get<BidangData[]>(`${this.baseUrl}/province/${kdProp}`);
  }

  /**
   * Convert WKT geometry to GeoJSON format for Leaflet
   */
  convertWktToGeoJson(data: BidangData[]): any[] {
    return data.map(item => ({
      type: 'Feature',
      properties: {
        id: item.id,
        nop: item.nop,
        kd_prop: item.kd_prop,
        kd_dati2: item.kd_dati2,
        kd_kec: item.kd_kec,
        kd_kel: item.kd_kel,
        kd_blok: item.kd_blok,
        no_urut: item.no_urut,
        kd_jns_op: item.kd_jns_op,
        created_at: item.created_at,
        is_active: item.is_active
      },
      geometry: this.parseWktGeometry(item.geom)
    }));
  }

  /**
   * Parse WKT geometry string to GeoJSON geometry
   */
  private parseWktGeometry(wkt: string): any {
    // Simple WKT to GeoJSON parser for POLYGON
    // This is a basic implementation - you might want to use a proper WKT parser library
    if (wkt.startsWith('01030000A0E6100000')) {
      // This is a POLYGON in WKB format, not WKT
      // For now, return a placeholder geometry
      return {
        type: 'Polygon',
        coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
      };
    }

    // If it's actual WKT, parse it
    if (wkt.startsWith('POLYGON')) {
      const coords = this.parsePolygonWkt(wkt);
      return {
        type: 'Polygon',
        coordinates: [coords]
      };
    }

    return {
      type: 'Polygon',
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
    };
  }

  /**
   * Parse POLYGON WKT string
   */
  private parsePolygonWkt(wkt: string): number[][] {
    // Extract coordinates from POLYGON((...))
    const match = wkt.match(/POLYGON\s*\(\s*\(\s*(.*?)\s*\)\s*\)/);
    if (!match) return [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]];

    const coordsStr = match[1];
    const coords = coordsStr.split(',').map(coord => {
      const [lng, lat] = coord.trim().split(/\s+/);
      return [parseFloat(lng), parseFloat(lat)];
    });

    return coords;
  }
}
