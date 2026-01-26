import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface KecamatanData {
    id?: string;
    kd_prop?: string;
    kd_dati2?: string;
    kd_kec: string;
    nama: string;
    color: string;
    geom?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface KelurahanData {
    id?: string;
    kd_prop?: string;
    kd_dati2?: string;
    kd_kec: string;
    kd_kel: string;
    nama: string;
    geom?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface BlokData {
    id?: string;
    kd_prop?: string;
    kd_dati2?: string;
    kd_kec: string;
    kd_kel: string;
    kd_blok: string;
    nama?: string;
    geom?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface AnggaranData {
    tahun_anggaran: number;
    jenis_pajak: string;
    nilai_anggaran: number;
    created_at?: string;
    updated_at?: string;
}

export interface JenisPajakOption {
    value: string;
    label: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    totalCount: number;
    page: number;
    size: number;
    totalPages: number;
}

@Injectable({
    providedIn: 'root'
})
export class SettingService {
    // Remove trailing slash to prevent double slash in URLs
    private apiUrl = environment.apiUrl.replace(/\/$/, '');

    constructor(private http: HttpClient) { }

    // ============ KECAMATAN ============

    /**
     * Get paginated list of kecamatan with filtering
     */
    getKecamatanPaginated(
        page: number = 0,
        size: number = 10,
        filters?: { kd_kec?: string; nama?: string }
    ): Observable<PaginatedResponse<KecamatanData>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (filters?.kd_kec) {
            params = params.set('kd_kec', filters.kd_kec);
        }
        if (filters?.nama) {
            params = params.set('nama', filters.nama);
        }

        return this.http.get<PaginatedResponse<KecamatanData>>(`${this.apiUrl}/api/kecamatan`, { params });
    }

    /**
     * Get single kecamatan by ID
     */
    getKecamatanById(id: string): Observable<KecamatanData> {
        return this.http.get<KecamatanData>(`${this.apiUrl}/api/kecamatan/${id}`);
    }

    /**
     * Create new kecamatan
     */
    createKecamatan(data: KecamatanData): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/kecamatan`, data);
    }

    /**
     * Update kecamatan
     */
    updateKecamatan(id: string, data: KecamatanData): Observable<any> {
        return this.http.put(`${this.apiUrl}/api/kecamatan/${id}`, data);
    }

    /**
     * Soft delete kecamatan
     */
    deleteKecamatan(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/api/kecamatan/${id}`);
    }

    /**
     * Recover deleted kecamatan
     */
    recoverKecamatan(id: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/api/kecamatan/${id}/recover`, {});
    }

    // ============ KELURAHAN ============

    /**
     * Get paginated list of kelurahan with filtering
     */
    getKelurahanPaginated(
        page: number = 0,
        size: number = 10,
        filters?: { kd_kec?: string; kd_kel?: string; nama?: string }
    ): Observable<PaginatedResponse<KelurahanData>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (filters?.kd_kec) {
            params = params.set('kd_kec', filters.kd_kec);
        }
        if (filters?.kd_kel) {
            params = params.set('kd_kel', filters.kd_kel);
        }
        if (filters?.nama) {
            params = params.set('nama', filters.nama);
        }

        return this.http.get<PaginatedResponse<KelurahanData>>(`${this.apiUrl}/api/kelurahan`, { params });
    }

    /**
     * Get single kelurahan by ID
     */
    getKelurahanById(id: string): Observable<KelurahanData> {
        return this.http.get<KelurahanData>(`${this.apiUrl}/api/kelurahan/${id}`);
    }

    /**
     * Create new kelurahan
     */
    createKelurahan(data: KelurahanData): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/kelurahan`, data);
    }

    /**
     * Update kelurahan
     */
    updateKelurahan(id: string, data: KelurahanData): Observable<any> {
        return this.http.put(`${this.apiUrl}/api/kelurahan/${id}`, data);
    }

    /**
     * Soft delete kelurahan
     */
    deleteKelurahan(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/api/kelurahan/${id}`);
    }

    /**
     * Recover deleted kelurahan
     */
    recoverKelurahan(id: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/api/kelurahan/${id}/recover`, {});
    }

    // ============ BLOK ============

    /**
     * Get paginated list of blok with filtering
     */
    getBlokPaginated(
        page: number = 0,
        size: number = 10,
        filters?: { kd_kec?: string; kd_kel?: string; kd_blok?: string }
    ): Observable<PaginatedResponse<BlokData>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (filters?.kd_kec) {
            params = params.set('kd_kec', filters.kd_kec);
        }
        if (filters?.kd_kel) {
            params = params.set('kd_kel', filters.kd_kel);
        }
        if (filters?.kd_blok) {
            params = params.set('kd_blok', filters.kd_blok);
        }

        return this.http.get<PaginatedResponse<BlokData>>(`${this.apiUrl}/api/blok`, { params });
    }

    /**
     * Get single blok by ID
     */
    getBlokById(id: string): Observable<BlokData> {
        return this.http.get<BlokData>(`${this.apiUrl}/api/blok/${id}`);
    }

    /**
     * Create new blok
     */
    createBlok(data: BlokData): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/blok`, data);
    }

    /**
     * Update blok
     */
    updateBlok(id: string, data: BlokData): Observable<any> {
        return this.http.put(`${this.apiUrl}/api/blok/${id}`, data);
    }

    /**
     * Soft delete blok
     */
    deleteBlok(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/api/blok/${id}`);
    }

    /**
     * Recover deleted blok
     */
    recoverBlok(id: string): Observable<any> {
        return this.http.patch(`${this.apiUrl}/api/blok/${id}/recover`, {});
    }

    // ============ ANGGARAN ============

    /**
     * Get paginated list of anggaran
     */
    getAnggaranPaginated(
        page: number = 0,
        size: number = 10,
        filters?: { tahun_anggaran?: number; jenis_pajak?: string }
    ): Observable<PaginatedResponse<AnggaranData>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('size', size.toString());

        if (filters?.tahun_anggaran) {
            params = params.set('tahun_anggaran', filters.tahun_anggaran.toString());
        }
        if (filters?.jenis_pajak) {
            params = params.set('jenis_pajak', filters.jenis_pajak);
        }

        return this.http.get<PaginatedResponse<AnggaranData>>(`${this.apiUrl}/api/anggaran`, { params });
    }

    /**
     * Get jenis pajak options for dropdown
     */
    getJenisPajakOptions(): Observable<JenisPajakOption[]> {
        return this.http.get<JenisPajakOption[]>(`${this.apiUrl}/api/anggaran/jenis-pajak`);
    }

    /**
     * Get single anggaran by composite key
     */
    getAnggaranById(tahun: number, jenis: string): Observable<AnggaranData> {
        return this.http.get<AnggaranData>(`${this.apiUrl}/api/anggaran/${tahun}/${jenis}`);
    }

    /**
     * Create new anggaran
     */
    createAnggaran(data: AnggaranData): Observable<any> {
        return this.http.post(`${this.apiUrl}/api/anggaran`, data);
    }

    /**
     * Update anggaran
     */
    updateAnggaran(tahun: number, jenis: string, data: AnggaranData): Observable<any> {
        return this.http.put(`${this.apiUrl}/api/anggaran/${tahun}/${jenis}`, data);
    }

    /**
     * Delete anggaran
     */
    deleteAnggaran(tahun: number, jenis: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/api/anggaran/${tahun}/${jenis}`);
    }
}
