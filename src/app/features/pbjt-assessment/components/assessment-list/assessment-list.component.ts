import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PbjtAssessmentService } from '../../services/pbjt-assessment.service';
import { Assessment } from '../../models/assessment.model';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';

// Extended interface with realization data
export interface AssessmentWithRealization extends Assessment {
  realisasi2021: number;
  realisasi2022: number;
  realisasi2023: number;
  realisasi2024: number;
  realisasi2025: number;
  totalRealisasi: number;
}

@Component({
  selector: 'app-assessment-list',
  templateUrl: './assessment-list.component.html',
  styleUrls: ['./assessment-list.component.scss']
})
export class AssessmentListComponent implements OnInit {
  assessments: AssessmentWithRealization[] = [];
  filteredAssessments: AssessmentWithRealization[] = [];
  loading: boolean = false;
  error: string = '';
  Math = Math; // Expose Math to template

  // Pagination
  currentPage: number = 0;
  pageSize: number = 10;
  totalElements: number = 0;
  totalPages: number = 0;
  hasNext: boolean = false;
  hasPrev: boolean = false;

  // Search and filter
  searchTerm: string = '';
  selectedKabupaten: string = '';
  selectedConfidenceLevel: string = '';

  constructor(
    private assessmentService: PbjtAssessmentService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadAssessments();
  }

  loadAssessments(): void {
    this.loading = true;
    this.error = '';

    // Load paginated assessments from backend with optional search
    this.assessmentService.getAllAssessments(this.currentPage, this.pageSize, this.searchTerm).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Map response data including realization from history
          this.filteredAssessments = response.data.map(item => {
            const history = item.realisasiHistory || [];

            // Helper to find amount by year
            const getAmount = (year: number) => {
              const record = history.find(h => h.tahun === year);
              return record ? record.realisasiAmount : 0;
            };

            return {
              ...item,
              realisasi2021: getAmount(2021),
              realisasi2022: getAmount(2022),
              realisasi2023: getAmount(2023),
              realisasi2024: getAmount(2024),
              realisasi2025: getAmount(2025),
              totalRealisasi: history.reduce((sum, h) => sum + (h.realisasiAmount || 0), 0)
            };
          });

          // Update pagination info from backend response
          if (response.pagination) {
            this.totalElements = response.pagination.totalElements;
            this.totalPages = response.pagination.totalPages;
            this.hasNext = response.pagination.hasNext;
            this.hasPrev = response.pagination.hasPrev;
          }
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading assessments:', error);
        this.error = 'Failed to load assessments';
        this.loading = false;
      }
    });
  }

  /**
   * Apply search filter - server-side search
   */
  applySearch(): void {
    this.currentPage = 0;
    this.loadAssessments();
  }

  private searchTimeout: any;

  /**
   * Handle search input change with debounce
   */
  onSearch(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.applySearch();
    }, 400);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadAssessments();
  }

  onNextPage(): void {
    if (this.hasNext) {
      this.currentPage++;
      this.loadAssessments();
    }
  }

  onPrevPage(): void {
    if (this.hasPrev) {
      this.currentPage--;
      this.loadAssessments();
    }
  }

  onFirstPage(): void {
    if (this.hasPrev) {
      this.currentPage = 0;
      this.loadAssessments();
    }
  }

  onLastPage(): void {
    if (this.hasNext) {
      this.currentPage = this.totalPages - 1;
      this.loadAssessments();
    }
  }

  viewDetail(assessment: AssessmentWithRealization): void {
    this.router.navigate(['/pbjt-assessment/detail', assessment.id]);
  }

  createNew(): void {
    this.router.navigate(['/pbjt-assessment/create']);
  }

  editAssessment(assessment: AssessmentWithRealization): void {
    this.router.navigate(['/pbjt-assessment/edit', assessment.id]);
  }

  viewOnMap(assessment: AssessmentWithRealization): void {
    // Navigate to map with query parameters for location
    this.router.navigate(['/pbjt-assessment/map'], {
      queryParams: {
        lat: assessment.location?.latitude,
        lng: assessment.location?.longitude,
        businessId: assessment.id,
        businessName: assessment.businessName
      }
    });
  }

  viewOnGoogleMaps(assessment: AssessmentWithRealization): void {
    // Open location in Google Maps in a new tab
    const lat = assessment.location?.latitude;
    const lng = assessment.location?.longitude;

    if (lat && lng) {
      const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      alert('Koordinat lokasi tidak tersedia untuk assessment ini.');
    }
  }

  deleteAssessment(assessment: AssessmentWithRealization): void {
    if (confirm(`Are you sure you want to delete assessment for ${assessment.businessName}?`)) {
      this.assessmentService.deleteAssessment(assessment.id!).subscribe({
        next: () => {
          this.loadAssessments();
        },
        error: (error) => {
          console.error('Error deleting assessment:', error);
          alert('Failed to delete assessment');
        }
      });
    }
  }

  formatCurrency(value: number | undefined): string {
    return this.assessmentService.formatCurrency(value);
  }

  formatPercentage(value: number | undefined): string {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(0)}%`;
  }

  getConfidenceBadgeClass(level: string | undefined): string {
    return this.assessmentService.getConfidenceBadgeClass(level || '');
  }

  getBusinessTypeDisplay(type: string | undefined): string {
    return this.assessmentService.getBusinessTypeDisplayName(type || '');
  }

  /**
   * Export all assessments to Excel file
   */
  exportToExcel(): void {
    // Load ALL data for export (not just current page)
    this.assessmentService.getAllAssessments(0, 1000).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const allData = response.data.map((a: any, index: number) => {
            const history = a.realisasiHistory || [];
            const getAmount = (year: number) => {
              const record = history.find((h: any) => h.tahun === year);
              return record ? record.realisasiAmount : 0;
            };

            return {
              'No': index + 1,
              'Business ID': a.businessId || '',
              'Nama Usaha': a.businessName || '',
              'Tipe Usaha': this.getBusinessTypeDisplay(a.businessType),
              'Alamat': a.location?.address || '',
              'Kelurahan': a.location?.kelurahan || '',
              'Kecamatan': a.location?.kecamatan || '',
              'Kabupaten': a.location?.kabupaten || '',
              'Kapasitas': a.seatingCapacity || 0,
              'Luas Bangunan (m²)': a.buildingArea || '',
              'Jam Buka': a.operatingHoursStart || '',
              'Jam Tutup': a.operatingHoursEnd || '',
              'Tanggal Assessment': a.assessmentDate || '',
              'Monthly PBJT': a.monthlyPbjt || 0,
              'Annual PBJT': a.annualPbjt || 0,
              'Realisasi 2021': getAmount(2021),
              'Realisasi 2022': getAmount(2022),
              'Realisasi 2023': getAmount(2023),
              'Realisasi 2024': getAmount(2024),
              'Realisasi 2025': getAmount(2025),
              'Latitude': a.location?.latitude || '',
              'Longitude': a.location?.longitude || '',
              'Surveyor ID': a.surveyorId || ''
            };
          });

          if (allData.length === 0) {
            alert('Tidak ada data untuk di-export.');
            return;
          }

          const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(allData);
          const columnWidths = Object.keys(allData[0] || {}).map(key => ({
            wch: Math.max(key.length + 2, 15)
          }));
          worksheet['!cols'] = columnWidths;

          const workbook: XLSX.WorkBook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Assessment PBJT');

          const today = new Date();
          const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
          const filename = `PBJT_Assessment_${dateStr}.xlsx`;

          XLSX.writeFile(workbook, filename);
        }
      },
      error: (error) => {
        console.error('Error exporting:', error);
        alert('Gagal export data!');
      }
    });
  }
}
