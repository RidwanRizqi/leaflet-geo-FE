import { Component, OnInit, ViewChild, ElementRef, TemplateRef } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PbjtAssessmentService } from '../../services/pbjt-assessment.service';
import { Assessment } from '../../models/assessment.model';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';

// Tambahkan import bootstrap jika global window.bootstrap tidak tersedia


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

  // Observability Modal State
  selectedAssessmentForObservation: any = null;
  loadingObservations: boolean = false;
  assessmentObservations: any[] = [];
  
  dayTypes = [
    { value: 'WEEKDAY_PEAK', label: 'Hari Kerja - Ramai' },
    { value: 'WEEKDAY_OFFPEAK', label: 'Hari Kerja - Sepi' },
    { value: 'WEEKEND_PEAK', label: 'Akhir Pekan - Ramai' }
  ];

  activeObservationTab: 'SAMPLE' | 'MENU' = 'MENU';
  menuObservationDate: string = '';
  menuItemsEdit: any[] = [];
  openingDaysPerMonthEdit: number = 30;
  savingMenuMethod = false;
  menuObservations: any[] = [];
  showMenuForm: boolean = false;

  newObservation: any = {
    observationDate: '',
    dayType: 'WEEKDAY_PEAK',
    visitors: 0,
    durationHours: 0,
    notes: '',
    sampleTransactions: [
      { amount: null, notes: '' },
      { amount: null, notes: '' },
      { amount: null, notes: '' },
      { amount: null, notes: '' },
      { amount: null, notes: '' }
    ]
  };

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
  
  // Category filter (hotel or makanan)
  category: string = '';
  basePath: string = '/pbjt-assessment';

  @ViewChild('observationModalTemplate') observationModalTemplate!: TemplateRef<any>;

  constructor(
    private assessmentService: PbjtAssessmentService,
    private router: Router,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    const url = this.router.url;
    if (url.startsWith('/pbjt-hotel')) {
      this.category = 'hotel';
      this.basePath = '/pbjt-hotel';
    } else {
      this.category = 'makanan';
      this.basePath = '/pbjt-assessment';
    }
    this.loadAssessments();
  }

  loadAssessments(): void {
    this.loading = true;
    this.error = '';

    // Load paginated assessments from backend with optional search
    this.assessmentService.getAllAssessments(this.currentPage, this.pageSize, this.searchTerm, this.category).subscribe({
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
    this.router.navigate([`${this.basePath}/detail`, assessment.id]);
  }

  createNew(): void {
    this.router.navigate([`${this.basePath}/create`]);
  }

  editAssessment(assessment: AssessmentWithRealization): void {
    this.router.navigate([`${this.basePath}/edit`, assessment.id]);
  }

  viewOnMap(assessment: AssessmentWithRealization): void {
    // Navigate to map with query parameters for location
    this.router.navigate([`${this.basePath}/map`], {
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

  openObservationModal(assessment: any): void {
    this.selectedAssessmentForObservation = assessment;
    this.activeObservationTab = 'MENU';
    // Deep copy menu items so changes aren't directly applied to the table row until saved
    this.menuItemsEdit = assessment.menuItems ? JSON.parse(JSON.stringify(assessment.menuItems)) : [];
    this.openingDaysPerMonthEdit = assessment.openingDaysPerMonth || 30;
    this.menuObservationDate = ''; // Reset observation date
    this.showMenuForm = false;

    this.newObservation = {
      observationDate: '',
      dayType: 'WEEKDAY_PEAK',
      visitors: 0,
      durationHours: 0,
      notes: '',
      sampleTransactions: [
        { amount: null, notes: '' },
        { amount: null, notes: '' },
        { amount: null, notes: '' },
        { amount: null, notes: '' },
        { amount: null, notes: '' }
      ]
    };
    this.loadObservations(assessment.id);
    this.loadMenuObservations(assessment.id);

    // Only open the modal if we are initiating the check, not refreshing
    if (!this.modalService.hasOpenModals()) {
      this.modalService.open(this.observationModalTemplate, { size: 'lg', centered: true, backdrop: 'static' });
    }
  }

  loadObservations(assessmentId: number): void {
    this.loadingObservations = true;
    this.assessmentService.getObservations(assessmentId).subscribe({
      next: (res: any) => {
        // Response bisa jadi di res.data atau array langsung
        if (res && res.data) {
           this.assessmentObservations = res.data;
        } else if (Array.isArray(res)) {
           this.assessmentObservations = res;
        } else {
           this.assessmentObservations = [];
        }
        this.loadingObservations = false;
      },
      error: (err) => {
        console.error('Error loading observations:', err);
        this.loadingObservations = false;
      }
    });
  }

  addSampleToNewObservation(): void {
    if (this.newObservation.sampleTransactions.length < 30) {
      this.newObservation.sampleTransactions.push({ amount: null, notes: '' });
    }
  }

  removeSampleFromNewObservation(index: number): void {
    if (this.newObservation.sampleTransactions.length > 5) {
      this.newObservation.sampleTransactions.splice(index, 1);
    }
  }

  submitObservation(): void {
    if (!this.newObservation.observationDate || this.newObservation.visitors <= 0) {
      alert('Mohon isi Tanggal Observasi dan Jumlah Pengunjung dengan benar (Pengunjung > 0).');
      return;
    }

    // Filter amounts
    const payload = {
      ...this.newObservation,
      sampleTransactions: this.newObservation.sampleTransactions.filter((tx: any) => tx.amount !== null && tx.amount > 0)
    };

    if (payload.sampleTransactions.length === 0) {
      alert('Mohon isi minimal 1 sampel transaksi yang valid (Amount > 0).');
      return;
    }

    this.loadingObservations = true;
    // Panggil Add observation endpoint menggunakan array jika Service mengharapkan array (seperti di assessment form sebelumnya) 
    // Tapi ini endpoint baru, seharusnya bisa single dto:
    this.assessmentService.addObservation(this.selectedAssessmentForObservation.id, payload).subscribe({
      next: (res: any) => {
        alert('Observasi berhasil ditambahkan!');
        // Refresh this specific observation view
        this.openObservationModal(this.selectedAssessmentForObservation);
        // Refresh master list background
        this.loadAssessments();
      },
      error: (err) => {
        console.error('Error saving observation:', err);
        alert('Gagal menyimpan observasi.');
        this.loadingObservations = false;
      }
    });
  }

  deleteObservation(obsId: number): void {
    if (confirm('Apakah Anda yakin ingin menghapus observasi ini? Data pajaknya akan dikalkulasi ulang secara otomatis.')) {
      this.loadingObservations = true;
      this.assessmentService.deleteObservation(obsId).subscribe({
        next: (res: any) => {
          this.loadObservations(this.selectedAssessmentForObservation.id);
          this.loadAssessments(); // Kalkulasi master background
        },
        error: (err) => {
          console.error('Error deleting observation:', err);
          alert('Gagal menghapus observasi.');
          this.loadingObservations = false;
        }
      });
    }
  }

  addMenuMethodItem(): void {
    this.menuItemsEdit.push({ name: '', price: null, category: 'FOOD' });
  }

  removeMenuMethodItem(index: number): void {
    this.menuItemsEdit.splice(index, 1);
  }

  deleteMenuObservation(obsId: number): void {
    if (confirm('Apakah Anda yakin ingin menghapus riwayat observasi menu ini?')) {
      this.loadingObservations = true;
      const assessmentId = this.selectedAssessmentForObservation.id;
      this.assessmentService.deleteMenuObservation(assessmentId, obsId).subscribe({
        next: (res: any) => {
          this.loadMenuObservations(assessmentId);
        },
        error: (err) => {
          console.error('Error deleting menu observation:', err);
          alert('Gagal menghapus observasi menu.');
          this.loadingObservations = false;
        }
      });
    }
  }

  loadMenuObservations(assessmentId: number): void {
    this.loadingObservations = true;
    this.assessmentService.getMenuObservations(assessmentId).subscribe({
      next: (res: any) => {
        if (res && res.data) {
           this.menuObservations = res.data;
        } else if (Array.isArray(res)) {
           this.menuObservations = res;
        } else {
           this.menuObservations = [];
        }
        this.loadingObservations = false;
      },
      error: (err) => {
        console.error('Error loading menu observations:', err);
        this.loadingObservations = false;
      }
    });
  }

  openMenuForm(): void {
    this.showMenuForm = true;
    this.menuObservationDate = '';
  }

  cancelMenuForm(): void {
    this.showMenuForm = false;
  }

  submitMenuMethod(): void {
    if (!this.menuObservationDate) {
      alert('Tanggal observasi wajib diisi.');
      return;
    }

    if (!this.openingDaysPerMonthEdit || this.openingDaysPerMonthEdit < 1 || this.openingDaysPerMonthEdit > 31) {
      alert('Hari buka per bulan harus antara 1-31.');
      return;
    }

    if (this.menuItemsEdit.length > 0) {
      const validItems = this.menuItemsEdit.every(item => item.name && item.price && item.category);
      if (!validItems) {
        alert('Harap lengkapi semua baris nama menu, harga, dan kategori.');
        return;
      }
    }

    this.savingMenuMethod = true;
    const payload = {
      observationDate: this.menuObservationDate,
      openingDaysPerMonth: this.openingDaysPerMonthEdit,
      menuItems: this.menuItemsEdit
    };

    this.assessmentService.updateMenuMethod(this.selectedAssessmentForObservation.id, payload).subscribe({
      next: (res) => {
        alert('Metode Menu / Nilai Tengah berhasil disimpan!');
        this.savingMenuMethod = false;
        this.showMenuForm = false;
        this.loadMenuObservations(this.selectedAssessmentForObservation.id);
        
        this.loadAssessments();
        
        this.assessmentService.getAssessmentById(this.selectedAssessmentForObservation.id).subscribe({
          next: (detailRes) => {
            if(detailRes && detailRes.data) {
                this.selectedAssessmentForObservation = detailRes.data;
                this.menuItemsEdit = detailRes.data.menuItems ? JSON.parse(JSON.stringify(detailRes.data.menuItems)) : [];
            }
          }
        });
      },
      error: (err) => {
        console.error(err);
        alert('Gagal menyimpan Data Metode Menu!');
        this.savingMenuMethod = false;
      }
    });
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
