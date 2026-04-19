import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import {
  Accommodation,
  AccommodationType,
  FormalizationStatus,
  PropertyStatus
} from '../models/accommodation.model';
import { environment } from '../../../../environments/environment';

export interface AccommodationFilter {
  type?: AccommodationType;
  status?: string;
  formalization?: FormalizationStatus;
  minRooms?: number;
  maxRooms?: number;
  minRevenue?: number;
  maxRevenue?: number;
  district?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class AccommodationService {
  private apiUrl = `${environment.apiUrl}api/hotel-accommodations`;
  private propertiesSubject = new BehaviorSubject<Accommodation[]>([]);
  public properties$ = this.propertiesSubject.asObservable();

  constructor(private http: HttpClient) {}

  getAccommodations(filter?: AccommodationFilter): Observable<PaginatedResponse<Accommodation>> {
    let params = new HttpParams();
    if (filter?.search) {
      params = params.set('search', filter.search);
    }

    return this.http.get<any>(`${this.apiUrl}/with-realization`, { params }).pipe(
      map(response => {
        const items = (response.data || []).map((h: any) => this.mapToAccommodation(h));
        let filtered = items;
        if (filter?.type) filtered = filtered.filter((p: Accommodation) => p.accommodationType === filter.type);
        if (filter?.status) filtered = filtered.filter((p: Accommodation) => p.status === filter.status);
        if (filter?.formalization) filtered = filtered.filter((p: Accommodation) => p.formalizationStatus === filter.formalization);

        this.propertiesSubject.next(filtered);

        const page = filter?.page || 0;
        const pageSize = filter?.pageSize || 10;
        const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

        return {
          items: paged,
          total: filtered.length,
          page,
          pageSize,
          totalPages: Math.ceil(filtered.length / pageSize)
        };
      })
    );
  }

  getAccommodationById(id: string): Observable<Accommodation> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map(response => this.mapToAccommodation(response.data))
    );
  }

  createAccommodation(data: Partial<Accommodation>): Observable<Accommodation> {
    const payload = this.mapToBackend(data);
    return this.http.post<any>(this.apiUrl, payload).pipe(
      map(response => this.mapToAccommodation(response.data)),
      tap(() => this.refreshProperties())
    );
  }

  updateAccommodation(id: string, data: Partial<Accommodation>): Observable<Accommodation> {
    const payload = this.mapToBackend(data);
    return this.http.put<any>(`${this.apiUrl}/${id}`, payload).pipe(
      map(response => this.mapToAccommodation(response.data)),
      tap(() => this.refreshProperties())
    );
  }

  deleteAccommodation(id: string): Observable<void> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.refreshProperties()),
      map(() => void 0)
    );
  }

  getByType(type: AccommodationType): Observable<Accommodation[]> {
    return this.http.get<any>(`${this.apiUrl}/with-realization`).pipe(
      map(response => (response.data || [])
        .map((h: any) => this.mapToAccommodation(h))
        .filter((a: Accommodation) => a.accommodationType === type))
    );
  }

  getPropertiesForMap(): Observable<Accommodation[]> {
    return this.http.get<any>(`${this.apiUrl}/with-realization`).pipe(
      map(response => (response.data || []).map((h: any) => this.mapToAccommodation(h)))
    );
  }

  getTypeStatistics(type: AccommodationType): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/with-realization`).pipe(
      map(response => {
        const properties = (response.data || [])
          .map((h: any) => this.mapToAccommodation(h))
          .filter((p: Accommodation) => p.accommodationType === type);
        return {
          count: properties.length,
          avgRevenue: properties.reduce((sum: number, p: Accommodation) => sum + (p.estimatedAnnualRevenue || 0), 0) / (properties.length || 1),
          formalCount: properties.filter((p: Accommodation) => p.hasBusinessPermit && p.hasTaxRegistration).length
        };
      })
    );
  }

  syncFromSimatda(): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sync`, {}).pipe(
      tap(() => this.refreshProperties())
    );
  }

  getWithRealization(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/with-realization`).pipe(
      map(response => response.data || [])
    );
  }

  uploadImages(files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    return this.http.post<any>(`${this.apiUrl}/upload-images`, formData);
  }

  private refreshProperties(): void {
    this.http.get<any>(`${this.apiUrl}/with-realization`).subscribe(response => {
      const items = (response.data || []).map((h: any) => this.mapToAccommodation(h));
      this.propertiesSubject.next(items);
    });
  }

  private mapToAccommodation(data: any): Accommodation {
    const r2022 = Number(data.realisasi_2022 || 0);
    const r2023 = Number(data.realisasi_2023 || 0);
    const r2024 = Number(data.realisasi_2024 || 0);
    const r2025 = Number(data.realisasi_2025 || 0);
    const r2026 = Number(data.realisasi_2026 || 0);
    const totalRealisasi = Number(data.total_realisasi || 0);

    const yearsWithData = [r2022, r2023, r2024, r2025, r2026].filter(v => v > 0).length;
    const avgYearlyTax = yearsWithData > 0 ? totalRealisasi / yearsWithData : 0;
    const estimatedRevenue = data.estimated_annual_revenue
      ? Number(data.estimated_annual_revenue)
      : avgYearlyTax * 10;
    const projectedTax = data.projected_annual_tax
      ? Number(data.projected_annual_tax)
      : avgYearlyTax * 1.05;

    return {
      id: String(data.id),
      accommodationType: (data.accommodation_type || 'HOTEL') as AccommodationType,
      propertyName: data.property_name || '',
      ownerName: data.owner_name || '',
      ownerPhone: data.owner_phone || '',
      address: data.address || '',
      kelurahan: data.kelurahan || '',
      kecamatan: data.kecamatan || '',
      kabupaten: data.kabupaten || 'KABUPATEN LUMAJANG',
      latitude: data.latitude ? Number(data.latitude) : undefined,
      longitude: data.longitude ? Number(data.longitude) : undefined,
      totalRooms: data.total_rooms || 0,
      buildingArea: data.building_area ? Number(data.building_area) : undefined,
      landArea: data.land_area ? Number(data.land_area) : undefined,
      hasBusinessPermit: data.has_business_permit || false,
      hasTaxRegistration: data.has_tax_registration || false,
      formalizationStatus: (data.formalization_status || 'INFORMAL') as FormalizationStatus,
      estimatedAnnualRevenue: estimatedRevenue,
      projectedAnnualTax: projectedTax,
      willingToFormalize: data.willing_to_formalize,
      status: (data.status || 'ACTIVE') as PropertyStatus,
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      photoUrls: this.parsePostgresArray(data.photo_urls),
      supportingDocUrl: data.supporting_doc_url || ''
    };
  }

  private mapToBackend(data: Partial<Accommodation>): any {
    return {
      accommodation_type: data.accommodationType,
      property_name: data.propertyName,
      owner_name: data.ownerName,
      owner_phone: data.ownerPhone,
      address: data.address,
      kelurahan: data.kelurahan,
      kecamatan: data.kecamatan,
      kabupaten: data.kabupaten,
      latitude: data.latitude,
      longitude: data.longitude,
      total_rooms: data.totalRooms,
      building_area: data.buildingArea,
      land_area: data.landArea,
      has_business_permit: data.hasBusinessPermit,
      has_tax_registration: data.hasTaxRegistration,
      formalization_status: data.formalizationStatus,
      estimated_annual_revenue: data.estimatedAnnualRevenue,
      projected_annual_tax: data.projectedAnnualTax,
      willing_to_formalize: data.willingToFormalize,
      status: data.status,
      photo_urls: data.photoUrls,
      supporting_doc_url: data.supportingDocUrl
    };
  }

  private parsePostgresArray(value: any): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(String);
    const str = String(value).trim();
    if (!str.startsWith('{') || !str.endsWith('}')) return [str];
    const inner = str.slice(1, -1);
    if (!inner) return [];
    const result: string[] = [];
    let i = 0;
    while (i < inner.length) {
      if (inner[i] === '"') {
        i++;
        let end = i;
        while (end < inner.length) {
          if (inner[end] === '"' && inner[end - 1] !== '\\') { break; }
          end++;
        }
        result.push(inner.slice(i, end));
        i = end + 1;
        if (inner[i] === ',') i++;
      } else {
        const commaIdx = inner.indexOf(',', i);
        if (commaIdx === -1) { result.push(inner.slice(i).trim()); break; }
        result.push(inner.slice(i, commaIdx).trim());
        i = commaIdx + 1;
      }
    }
    return result.filter(s => s.length > 0);
  }
}
