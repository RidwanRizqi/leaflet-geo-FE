import { Component, OnInit, ViewChild, ElementRef, TemplateRef } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PbjtAssessmentService } from '../../services/pbjt-assessment.service';
import { Assessment } from '../../models/assessment.model';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';
import SignaturePad  from 'signature_pad';
import { Store } from '@ngrx/store';
import { selectCurrentUser } from 'src/app/store/auth/auth.selector';

// Extended interface with realization data
export interface AssessmentWithRealization extends Assessment {
  realisasi2021: number;
  realisasi2022: number;
  realisasi2023: number;
  realisasi2024: number;
  realisasi2025: number;
  totalRealisasi: number;
  justifikasiOmzet: number;
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

    // Signature fields
  wpName: string = '';
  petugasName: string = '';
  wpSignaturePad!: SignaturePad;
  petugasSignaturePad!: SignaturePad;
  selectedAssessmentForPrint: any = null;

  @ViewChild('observationModalTemplate') observationModalTemplate!: TemplateRef<any>;
  currentUser: any = null;

  constructor(
    private assessmentService: PbjtAssessmentService,
    private router: Router,
    private modalService: NgbModal,
    private store: Store
  ) { }

  ngOnInit(): void {
    this.store.select(selectCurrentUser).subscribe(user => {
      this.currentUser = user;
    });

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
              totalRealisasi: history.reduce((sum, h) => sum + (h.realisasiAmount || 0), 0),
              justifikasiOmzet: (item as any).justifikasiOmzet || 0
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

  printBeritaAcara(assessment: AssessmentWithRealization): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka pop-up untuk print. Harap izinkan pop-up di browser Anda.');
      return;
    }

    const formatCurrency = (val: number | null | undefined) => {
      if (val == null) return 'Rp 0';
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
    };

    const formatDate = (dateString: string | null | undefined) => {
      if (!dateString) return '-';
      return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const htmlContent = `
      <html>
        <head>
          <title>Berita Acara - ${assessment.businessName}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 40px; line-height: 1.6; color: #000; }
            h2 { text-align: center; text-transform: uppercase; margin-bottom: 5px; }
            h4 { text-align: center; font-weight: normal; margin-top: 0; margin-bottom: 40px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            table, th, td { border: 1px solid #000; }
            th, td { padding: 10px; text-align: left; }
            th { background-color: #f2f2f2; width: 40%; }
            .header-info { margin-bottom: 30px; }
            .signature-area { margin-top: 60px; width: 100%; }
            .signature-box { width: 45%; display: inline-block; text-align: center; align-items: center; }
            .signature-box.right { float: right; }
            .signature-line { margin-top: 80px; border-top: 1px solid #000; width: 80%; display: inline-block; }
            @media print {
              body { padding: 0; margin: 1cm; }
              @page { size: A4; margin: 20mm; }
            }
          </style>
        </head>
        <body>
          <h2>BERITA ACARA PEMERIKSAAN PAJAK</h2>
          <h4>PAJAK BARANG DAN JASA TERTENTU (PBJT) MAKANAN DAN MINUMAN</h4>
          
          <div class="header-info">
            <p>Pada hari ini, tanggal <strong>${formatDate(assessment.assessmentDate)}</strong>, telah dilakukan pemeriksaan potensi pajak untuk usaha makanan dan minuman terhadap:</p>
          </div>
          
          <table>
            <tr>
              <th>Nama Usaha</th>
              <td>${assessment.businessName || '-'}</td>
            </tr>
            <tr>
              <th>Alamat</th>
              <td>${assessment.location?.address || '-'}</td>
            </tr>
            <tr>
              <th>NPWPD / Objek Pajak</th>
              <td>${(assessment as any).taxObjectNumber || '-'}</td>
            </tr>
            <tr>
              <th>Jenis Usaha</th>
              <td>${assessment.businessType ? assessment.businessType.replace('_', ' ') : '-'}</td>
            </tr>
            <tr>
              <th>Kapasitas Tempat Duduk</th>
              <td>${assessment.seatingCapacity || 0} Kursi</td>
            </tr>
            <tr>
              <th>Rata-rata Pendapatan / Bulan</th>
              <td>${formatCurrency(assessment.monthlyRevenueRaw)}</td>
            </tr>
            <tr>
              <th>Potensi Pajak (PBJT) / Bulan</th>
              <td><strong>${formatCurrency(assessment.monthlyPbjt)}</strong></td>
            </tr>
          </table>

          <p>Demikian Berita Acara Pemeriksaan Pajak ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
          
          <div class="signature-area">
            <div class="signature-box">
              <p>Wajib Pajak / Penanggung Jawab,</p>
              <br><br><br>
              <div class="signature-line"></div>
              <p>(${(assessment as any).ownerName || '.....................................'})</p>
            </div>
            <div class="signature-box right">
              <p>Petugas Pemeriksa (Surveyor),</p>
              <br><br><br>
              <div class="signature-line"></div>
              <p>(${assessment.surveyorId || '.....................................'})</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Tunggu sedikit sampai konten di render, lalu panggil window.print()
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
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
      this.modalService.open(this.observationModalTemplate, { size: 'xl', centered: true, backdrop: 'static' }).result.then();
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

  openSignatureModal(assessment: any, modalTemplate: any){
    this.selectedAssessmentForPrint = assessment;
    
    // 1. Nama Wajib Pajak:
    // Dinamis mengambil dari DB (misal simpatda). 
    // Pastikan backend mengirimkan field 'ownerName', jika tidak ada maka default kosong.
    this.wpName = assessment.ownerName || assessment.businessName || '';
    
    // 2. Nama Petugas Pemeriksa:
    if (this.currentUser) {
        // Ambil role user saat ini (menangani bentuk array maupun string)
        const role = Array.isArray(this.currentUser.roles_name) 
                      ? this.currentUser.roles_name[0] 
                      : (this.currentUser.role || this.currentUser.roles_name || '');
        
        // Jika yang login BUKAN Admin, langsung isi dengan nama aslinya
        if (role && !role.toLowerCase().includes('admin')) {
            this.petugasName = this.currentUser.name || this.currentUser.username || assessment.surveyorId || '';
        } else {
            // Jika admin, biarkan kosong agar diketik manual
            this.petugasName = ''; 
        }
    } else {
        this.petugasName = assessment.surveyorId || '';
    }

    this.modalService.open(modalTemplate, { size: 'lg', backdrop: 'static'}).result.then(
      (result) => {
        if (result === 'generate'){
          const wpCanvas = document.getElementById('wpCanvas') as HTMLCanvasElement;
          const petugasCanvas = document.getElementById('petugasCanvas') as HTMLCanvasElement;
          
          const wpSig = this.wpSignaturePad.isEmpty() ? null : this.trimCanvas(wpCanvas || (this.wpSignaturePad as any).canvas);
          const petugasSig = this.petugasSignaturePad.isEmpty() ? null : this.trimCanvas(petugasCanvas || (this.petugasSignaturePad as any).canvas);
          this.generatePrintBeritaAcara(this.selectedAssessmentForPrint, wpSig, petugasSig);
        }
      },
      (reason) => {}
    );

    setTimeout(() => {
      const canvasWp = document.getElementById('wpCanvas') as HTMLCanvasElement;
      const canvasPetugas = document.getElementById('petugasCanvas') as HTMLCanvasElement;

      if(canvasWp && canvasPetugas){
        // Menambahkan properti minWidth dan maxWidth agar tinta (stroke) lebih tebal/bold
        const signatureConfig = {
          backgroundColor: 'rgba(255, 255, 255, 0)',
          minWidth: 2.5,
          maxWidth: 5.5,
          penColor: 'black'
        };
        this.wpSignaturePad = new SignaturePad(canvasWp, signatureConfig);
        this.petugasSignaturePad = new SignaturePad(canvasPetugas, signatureConfig);
      }
    }, 200);
  }

  clearWpSignature(){
    if (this.wpSignaturePad) this.wpSignaturePad.clear();
  }

  clearPetugasSignature(){
    if (this.petugasSignaturePad) this.petugasSignaturePad.clear();
  }

  trimCanvas(canvas: HTMLCanvasElement): string | null {
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const copy = document.createElement('canvas').getContext('2d');
    if (!copy) return null;

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const l = pixels.data.length;
    let bound = { top: null, left: null, right: null, bottom: null } as any;
    let i, x, y;

    // Membaca setiap pixel untuk mencari batas ruang kosong (transparan)
    for (i = 0; i < l; i += 4) {
      if (pixels.data[i + 3] !== 0) { // Jika pixel tidak transparan
        x = (i / 4) % canvas.width;
        y = ~~((i / 4) / canvas.width);

        if (bound.top === null) { bound.top = y; }
        if (bound.left === null) { bound.left = x; } else if (x < bound.left) { bound.left = x; }
        if (bound.right === null) { bound.right = x; } else if (bound.right < x) { bound.right = x; }
        if (bound.bottom === null) { bound.bottom = y; } else if (bound.bottom < y) { bound.bottom = y; }
      }
    }

    if (bound.top === null) {
      return null; // Kanvas kosong (tidak ada coretan)
    }

    // Tambahkan sedikit jarak/margin (padding) agar coretan tidak terlalu mepet
    const padding = 10;
    bound.top = Math.max(0, bound.top - padding);
    bound.left = Math.max(0, bound.left - padding);
    bound.right = Math.min(canvas.width, bound.right + padding);
    bound.bottom = Math.min(canvas.height, bound.bottom + padding);

    const trimHeight = bound.bottom - bound.top;
    const trimWidth = bound.right - bound.left;
    const trimmed = ctx.getImageData(bound.left, bound.top, trimWidth, trimHeight);

    copy.canvas.width = trimWidth;
    copy.canvas.height = trimHeight;
    copy.putImageData(trimmed, 0, 0);

    return copy.canvas.toDataURL(); // Kembalikan gambar yang sudah di-crop
  }

  generatePrintBeritaAcara(assessment: any, wpSignatureData: string | null, petugasSignatureData: string | null): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Gagal membuka pop-up untuk print. Harap izinkan pop-up di browser Anda.');
      return;
    }

    const formatCurrency = (val: number | null | undefined) => {
      if (!val) return '..................';
      return new Intl.NumberFormat('id-ID').format(val);
    };

    // Fungsi untuk mengubah format tanggal ke format teks Indonesia
    const getTanggalIndo = () => {
      const date = new Date(assessment.assessmentDate || new Date());
      const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][date.getDay()];
      const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][date.getMonth()];
      return {
        hari: hari,
        tgl: date.getDate(),
        bln: bulan,
        thn: date.getFullYear()
      };
    };
    const tglInfo = getTanggalIndo();
    
    // Ambil rata-rata transaksi jika ada
    const avgTarif = assessment.observations && assessment.observations.length > 0 
                     ? assessment.observations[0].avgTransaction : null;

    const htmlContent = `
      <html>
        <head>
          <title>Berita Acara - ${assessment.businessName || 'Lumajang'}</title>
          <style>
            body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; color: #000; padding: 20px 40px; }
            .kop-surat { text-align: center; border-bottom: 3px solid #000; padding-bottom: 5px; margin-bottom: 20px; position: relative; }
            
            .logo-kiri { position: absolute; left: 15px; top: 0px; width: 85px; height: auto; }
            
            .kop-text h3 { margin: 0; font-size: 14pt; font-weight: normal; }

            .kop-text h2 { margin: 0; font-size: 16pt; font-weight: bold; }
            .kop-text p { margin: 0; font-size: 10pt; }
            
            .judul { text-align: center; margin-bottom: 20px; line-height: 1.2; }
            .judul h4 { margin: 0; font-size: 12pt; font-weight: bold; }
            .judul p { margin: 0; font-size: 11pt; font-weight: bold; }
            
            table.petugas { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
            table.petugas th, table.petugas td { border: 1px solid #000; padding: 5px; text-align: center; }
            
            .info-mejo { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .info-mejo td { padding: 2px 0; vertical-align: top; } 
            .col-noo { width: 25%; }
            .col-colan { width: 2%; }
            
            .checkbox-group { display: flex; align-items: center; margin: 10px 0; }
            .checkbox-item { margin-right: 20px; display: flex; align-items: center; }
            .checkbox-box { display: inline-block; width: 16px; height: 16px; border: 1px solid #000; text-align: center; line-height: 16px; font-size: 12px; margin-right: 8px; }
            
            ol { margin-top: 0; padding-left: 20px; } 
            .sub-list { padding-left: 10px; }
            .sub-list li { margin-bottom: 5px; list-style-type: lower-alpha; }
            .no-bullet { list-style: none!important; margin-left: -20px; display: flex; align-items: center; }
            
            .signature-area-ba { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; padding: 0 20px; }
            .signature-box-ba { width: 50%; display: flex; flex-direction: column; align-items: center; text-align: center; }
            .signature-img-ba { width: 280px; height: auto; max-height: 180px; margin: 5px 0; object-fit: contain; }
            
            @media print {
              body { padding: 0; margin: 0; }
              @page { size: A4; margin: 15mm; }
            }
          </style>
        </head>
        <body>
          <!-- KOP SURAT -->
          <div class="kop-surat">
          <img src="${window.location.origin}/assets/images/logo/logo-lumajang.png" alt="Logo Kabupaten Lumajang" class="logo-kiri">
            <div class="kop-text">
              <h3>PEMERINTAH KABUPATEN LUMAJANG</h3>
              <h2>BADAN PAJAK DAN RETRIBUSI DAERAH</h2>
              <p>Jl. Cokrosujono No. 6 Lumajang Telp. (0334) 893787</p>
              <p style="letter-spacing: 2px;"><strong>L U M A J A N G - 67315</strong></p>
            </div>
          </div>

          <!-- JUDUL -->
          <div class="judul">
            <h4>BERITA ACARA</h4>
            <p>PENDATAAN, PENDAFTARAN DAN PENILAIAN</p>
            <p>OBYEK DAN WAJIB PAJAK PBJT PENJUALAN MAKANAN DAN/ATAU MINUMAN</p>
          </div>

          <!-- PARAGRAF PEMBUKA -->
          <p style="text-indent: 40px; text-align: justify; margin-bottom: 5px;">
            Pada hari ini <strong>${tglInfo.hari}</strong>, tanggal <strong>${tglInfo.tgl}</strong> bulan <strong>${tglInfo.bln}</strong> tahun <strong>${tglInfo.thn}</strong> berdasarkan Surat Perintah
            Nomor: 000.1.2.3 / ............................ / 427.74/${tglInfo.thn} tanggal ............................ ${tglInfo.thn}, kami yang tersebut di bawah ini :
          </p>

          <!-- TABEL PETUGAS -->
          <table class="petugas">
            <tr>
              <th style="width: 8%;">No.</th>
              <th style="width: 52%;">Nama / NIP</th>
              <th style="width: 40%;">Jabatan</th>
            </tr>
            <tr>
              <td>1.</td>
              <td>${this.petugasName || '.........................................................'}<br>NIP. .....................................................</td>
              <td>Petugas Pajak</td>
            </tr>
          </table>

          <p style="margin-bottom: 5px;">telah melakukan pertemuan guna kepentingan konfirmasi, cek fisik dan pendataan potensi obyek pajak dengan :</p>

          <!-- DATA WAJIB PAJAK -->
          <table class="info-mejo">
            <tr><td class="col-label">Nama</td><td class="col-colan">:</td><td>${this.wpName || '.........................................................................................'}</td></tr>
            <tr><td>N.I.K</td><td>:</td><td>.........................................................................................</td></tr>
            <tr><td>Nama Obyek Usaha</td><td>:</td><td>${assessment.businessName || '.........................................................................................'}</td></tr>
            <tr><td>Alamat obyek Usaha</td><td>:</td><td>${assessment.location?.address || '.........................................................................................'}</td></tr>
            <tr><td>Nomor Telp</td><td>:</td><td>.........................................................................................</td></tr>
          </table>

          <div class="checkbox-group">
            <span style="margin-right: 15px;">Dalam hal ini bertindak selaku :</span>
            <div class="checkbox-item"><span class="checkbox-box"></span> Wajib Pajak</div>
            <div class="checkbox-item"><span class="checkbox-box"></span> Wakil</div>
            <div class="checkbox-item"><span class="checkbox-box"></span> Kuasa</div>
          </div>

          <p style="margin-bottom: 5px;">untuk :</p>
          <ol>
            <li>Menjelaskan alasan dan tujuan dilaksanakan pendataan, pendaftaran dan penilaian potensi obyek pajak baru;</li>
            <li>Mengedukasi dan mensosialisasikan tentang PBJT Penjualan dan/atau Penyerahan Makanan dan/atau Minuman;</li>
            <li>Mendata potensi dan mendaftarkan atas obyek PBJT Penjualan dan/atau Penyerahan Makanan dan/atau Minuman dengan informasi sebagai berikut :
              <ol class="sub-list">
                <li class="no-bullet"><span class="checkbox-box">v</span> Restoran/Rumah Makan/Warung/Kafe/Kantin</li>
                <li class="no-bullet"><span class="checkbox-box"></span> Penyedia Jasa Boga / Katering</li>
                <li>Jumlah fasilitas Meja/Kursi/Kapasitas duduk : <strong>${assessment.seatingCapacity || '......'}</strong> orang/meja/kursi</li>
                <li>Tarif menu makanan/minuman rata-rata sebesar Rp. <strong>${formatCurrency(avgTarif)}</strong></li>
                <li>Jumlah hari operasional usaha dalam sebulan : <strong>${assessment.openingDaysPerMonth || '......'}</strong> hari</li>
                <li>Transaksi penjualan dan / atau jumlah pengunjung 1 (satu) bulan, sebagai berikut :
                  <table class="info-mejo" style="margin-top: 5px; width: 95%;">
                    <tr><td style="width: 75%;">- Jumlah pengunjung pada hari weekend dan hari libur nasional</td><td style="width: 2%;">:</td><td>.................. orang</td></tr>
                    <tr><td>- Jumlah pengunjung pada hari biasa</td><td>:</td><td>.................. orang</td></tr>
                    <tr><td>- Jumlah rata-rata pengunjung dalam 1 (satu) bulan</td><td>:</td><td>.................. orang</td></tr>
                  </table>
                </li>
                <li>Pemilik usaha dan pengelola sudah menerapkan PBJT 10% :
                  <div class="checkbox-group" style="margin-top: 5px; margin-bottom: 0;">
                    <div class="checkbox-item"><span class="checkbox-box"></span> Sudah</div>
                    <div class="checkbox-item"><span class="checkbox-box"></span> Belum</div>
                  </div>
                </li>
                <li>Wajib Pajak telah MENYETUJUI dan/atau BERSEDIA dipungut pajak mulai bulan ................................ tahun 2026.</li>
                <li>Jika TIDAK SETUJU dan/atau TIDAK BERSEDIA dipungut pajak daerah, dengan alasan sebagai berikut:<br>
                    ...........................................................................................................................................................................<br>
                    dan bersedia menanggung sanksi sesuai peraturan perundang-undangan yang berlaku.
                </li>
              </ol>
            </li>
          </ol>

          <!-- PARAGRAF PENUTUP -->
          <p style="text-indent: 40px; text-align: justify; margin-top: 15px; margin-bottom: 10px;">
            Demikian Berita Acara Pendataan, Pendaftaran dan Penilaian obyek dan Wajib Pajak ini dibuat dengan sebenarnya dan ditanda tangani oleh:
          </p>

          <!-- TANDA TANGAN -->
          <div class="signature-area-ba">
            <div class="signature-box-ba">
              <p style="margin: 0;">Wajib Pajak/Wakil/Kuasa</p>
              ${wpSignatureData ? `<img src="${wpSignatureData}" class="signature-img-ba"/>` : `<br><br><br><br>`}
              <p style="margin: 0;"><strong>${this.wpName || '....................................................'}</strong></p>
            </div>
            
            <div class="signature-box-ba">
              <p style="margin: 0;">Petugas Pajak</p>
              ${petugasSignatureData ? `<img src="${petugasSignatureData}" class="signature-img-ba"/>` : `<br><br><br><br>`}
              <p style="margin: 0;"><strong>${this.petugasName || '....................................................'}</strong></p>
              <p style="margin: 5px 0 0 0;">NIP. ........................................</p>
            </div>
          </div>

          <p style="font-size: 9pt; font-style: italic; margin-top: 10px;">*) coret yang tidak perlu</p>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Tunggu sedikit sampai konten dirender sempurna lalu print
    setTimeout(() => {
      printWindow.print();
    }, 500);
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
