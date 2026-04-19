import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../../../environments/environment';

interface HotelPotensiData {
  no: number;
  op: string;
  namaOp: string;
  jenis: string;
  npwpd: string;
  namaWp: string;
  realisasi: { [year: string]: number };
  estimasiPendapatan: number;
  proyeksiPajak: number;
  operasi: string;
  keterangan: string;
  id?: number;
}

@Component({
  selector: 'app-hotel-assessment-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hotel-assessment-list.component.html',
  styleUrls: ['./hotel-assessment-list.component.scss']
})
export class HotelAssessmentListComponent implements OnInit {
  hotelData: HotelPotensiData[] = [];
  filteredData: HotelPotensiData[] = [];
  loading = true;
  error: string | null = null;
  searchTerm = '';
  years: string[] = ['2022', '2023', '2024', '2025', '2026'];
  Math = Math;

  // Pagination
  currentPage = 0;
  pageSize = 15;

  // Summary
  totalEstimasi = 0;
  totalProyeksi = 0;
  totalRealisasiByYear: { [year: string]: number } = {};

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    this.http.get<any>(`${environment.apiUrl}api/hotel-accommodations/with-realization`).subscribe({
      next: (response) => {
        const raw: any[] = response.data || [];
        this.hotelData = raw.map((item: any, index: number) => this.mapToPotensi(item, index));
        this.applyFilters();
        this.calculateSummary();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading hotel data with realization:', err);
        // Fallback: load from basic endpoint
        this.loadFallback();
      }
    });
  }

  private loadFallback(): void {
    this.http.get<any>(`${environment.apiUrl}api/hotel-accommodations`).subscribe({
      next: (response) => {
        const raw: any[] = response.data || [];
        this.hotelData = raw.map((item: any, index: number) => this.mapToPotensi(item, index));
        this.applyFilters();
        this.calculateSummary();
        this.loading = false;
      },
      error: (err) => {
        console.error('Fallback also failed:', err);
        this.error = 'Gagal memuat data. Pastikan backend berjalan.';
        this.loading = false;
      }
    });
  }

  private mapToPotensi(item: any, index: number): HotelPotensiData {
    const r2022 = Number(item.realisasi_2022 || item.realisasi2022 || 0);
    const r2023 = Number(item.realisasi_2023 || item.realisasi2023 || 0);
    const r2024 = Number(item.realisasi_2024 || item.realisasi2024 || 0);
    const r2025 = Number(item.realisasi_2025 || item.realisasi2025 || 0);
    const r2026 = Number(item.realisasi_2026 || 0);

    const totalRealisasi = r2022 + r2023 + r2024 + r2025 + r2026;
    const yearsWithData = [r2022, r2023, r2024, r2025, r2026].filter(v => v > 0).length;
    const avgYearly = yearsWithData > 0 ? totalRealisasi / yearsWithData : 0;

    return {
      no: index + 1,
      op: item.object_number || (item.simatda_id ? String(item.simatda_id).padStart(10, '0') : '-'),
      namaOp: item.property_name || '',
      jenis: item.accommodation_type || 'HOTEL',
      npwpd: item.npwpd || 'KOSONG',
      namaWp: item.owner_name || '',
      realisasi: {
        '2022': r2022,
        '2023': r2023,
        '2024': r2024,
        '2025': r2025,
        '2026': r2026
      },
      estimasiPendapatan: avgYearly > 0 ? avgYearly * 10 : 0,
      proyeksiPajak: avgYearly > 0 ? avgYearly * 1.05 : 0,
      operasi: item.status === 'CLOSED' ? 'TUTUP' : 'BUKA',
      keterangan: item.simatda_id ? 'LAMA' : 'BARU',
      id: item.id
    };
  }

  applyFilters(): void {
    if (!this.searchTerm) {
      this.filteredData = [...this.hotelData];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredData = this.hotelData.filter(d =>
        d.namaOp.toLowerCase().includes(term) ||
        d.namaWp.toLowerCase().includes(term) ||
        d.jenis.toLowerCase().includes(term) ||
        d.op.includes(term)
      );
    }
    this.currentPage = 0;
  }

  calculateSummary(): void {
    this.totalEstimasi = this.hotelData.reduce((sum, d) => sum + d.estimasiPendapatan, 0);
    this.totalProyeksi = this.hotelData.reduce((sum, d) => sum + d.proyeksiPajak, 0);
    this.years.forEach(y => {
      this.totalRealisasiByYear[y] = this.hotelData.reduce((sum, d) => sum + (d.realisasi[y] || 0), 0);
    });
  }

  get paginatedData(): HotelPotensiData[] {
    const start = this.currentPage * this.pageSize;
    return this.filteredData.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.pageSize);
  }

  onNextPage(): void { if (this.currentPage < this.totalPages - 1) this.currentPage++; }
  onPrevPage(): void { if (this.currentPage > 0) this.currentPage--; }
  onPageChange(page: number): void { this.currentPage = page; }
  onFilterChange(): void { this.applyFilters(); }

  // Navigation
  createNew(): void { this.router.navigate(['/pbjt-hotel/hotel-create']); }
  viewDetails(item: HotelPotensiData): void {
    if (item.id) this.router.navigate(['/pbjt-hotel/hotel-detail', item.id]);
  }
  editAssessment(item: HotelPotensiData): void {
    if (item.id) this.router.navigate(['/pbjt-hotel/hotel-edit', item.id]);
  }

  refresh(): void { this.loadData(); }

  formatCurrency(value: number): string {
    if (!value || value === 0) return '0';
    return new Intl.NumberFormat('id-ID').format(Math.round(value));
  }

  formatRealisasi(value: number): string {
    if (!value || value === 0) return '0';
    return new Intl.NumberFormat('id-ID').format(Math.round(value));
  }

  getJenisClass(jenis: string): string {
    switch (jenis) {
      case 'HOTEL': return 'bg-primary';
      case 'WISMA': return 'bg-success';
      case 'HOMESTAY': return 'bg-warning';
      case 'PENGINAPAN': return 'bg-info';
      case 'RUMAH_KOS': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  getJenisLabel(jenis: string): string {
    const labels: any = {
      'HOTEL': 'Hotel', 'WISMA': 'Wisma', 'HOMESTAY': 'Home Stay',
      'PENGINAPAN': 'Penginapan', 'RUMAH_KOS': 'Kos', 'KOS': 'Kos'
    };
    return labels[jenis] || jenis;
  }

  exportToExcel(): void {
    // Use BOM for proper UTF-8 encoding in Excel
    const BOM = '\ufeff';
    let csv = BOM + 'NO,OP,NAMA OP,JENIS,NPWPD,NAMA WP';
    this.years.forEach(y => csv += `,REALISASI ${y}`);
    csv += ',ESTIMASI PENDAPATAN,PROYEKSI PAJAK\n';

    this.filteredData.forEach(d => {
      csv += `${d.no},"${d.op}","${d.namaOp}","${d.jenis}","${d.npwpd}","${d.namaWp}"`;
      this.years.forEach(y => csv += `,${d.realisasi[y] || 0}`);
      csv += `,${d.estimasiPendapatan},${d.proyeksiPajak}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data-potensi-perhotelan.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
