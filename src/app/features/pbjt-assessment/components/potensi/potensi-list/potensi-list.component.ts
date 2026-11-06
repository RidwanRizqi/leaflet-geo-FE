import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PbjtPotensiService } from '../../../services/pbjt-potensi.service';
import { MasterMenu, MenuItem, PbjtPotensi, PotensiObservation } from '../../../models/potensi.model';
import * as XLSX from 'xlsx';
import { Store } from '@ngrx/store';
import { selectCurrentUser } from 'src/app/store/auth/auth.selector';
import SignaturePad from 'signature_pad';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-potensi-list',
  templateUrl: './potensi-list.component.html',
  styleUrls: ['./potensi-list.component.scss']
})
export class PotensiListComponent implements OnInit {
  @ViewChild('exportModal') exportModalTemplate!: TemplateRef<any>;
  @ViewChild('menuModal') menuModalTemplate!: TemplateRef<any>;
  @ViewChild('observationModal') observationModalTemplate!: TemplateRef<any>;
  @ViewChild('signatureModalTemplate') signatureModalTemplate!: TemplateRef<any>;
  @ViewChild('historyModalTemplate') historyModalTemplate!: TemplateRef<any>;

  // History & Comparison Modal State
  selectedPotensiHistory: PbjtPotensi | null = null;
  historyList: PotensiObservation[] = [];
  loadingHistory: boolean = false;
  activeHistoryTab: 'timeline' | 'compare' = 'timeline';

  // Comparison selections
  compareObsAId: number | null = null;
  compareObsBId: number | null = null;
  compareObsA: PotensiObservation | null = null;
  compareObsB: PotensiObservation | null = null;

  // Berita Acara Fields & Signature Pad
  wpName: string = '';
  petugasName: string = '';
  wpSignaturePad!: SignaturePad;
  petugasSignaturePad!: SignaturePad;
  selectedPotensiForPrint: PbjtPotensi | any = null;

  baNoSuratPerintah: string = '';
  baTanggal: string = '';
  baNip: string = '';
  baNik: string = '';
  baTelp: string = '';
  baBertindakSelaku: string = 'Wajib Pajak';
  baTarifMenu: number | null = null;
  baPengunjungWeekend: number | null = null;
  baPengunjungBiasa: number | null = null;
  baPengunjungRata: number | null = null;
  baSudahPbjt: boolean = false;
  baSetujuPajak: boolean = true;
  baAlasanTidakSetuju: string = '';

  // Breadcrumbs
  breadCrumbTitle: string = 'Potensi PBJT Makanan & Minuman';
  breadCrumbItems = [
    { label: 'PBJT Assessment' },
    { label: 'Potensi PBJT', active: true }
  ];

  potensiList: PbjtPotensi[] = [];
  loading: boolean = false;
  error: string = '';
  searchTerm: string = '';

  // KPI Counter Getters for Velzon Dashboard Widgets
  get totalUsahaCount(): number {
    return this.potensiList ? this.potensiList.length : 0;
  }

  get totalEstimasiOmzet(): number {
    if (!this.potensiList) return 0;
    return this.potensiList.reduce((sum, item) => sum + (Number(item.omzetBulanan) || 0), 0);
  }

  get totalEstimasiPbjt(): number {
    if (!this.potensiList) return 0;
    return this.potensiList.reduce((sum, item) => sum + (Number(item.pbjtBulanan) || 0), 0);
  }

  get totalObservasiCount(): number {
    if (!this.potensiList) return 0;
    return this.potensiList.reduce((sum, item) => sum + (Number(item.observationCount) || 0), 0);
  }

  // Pagination
  currentPage: number = 0;
  pageSize: number = 10;
  totalElements: number = 0;
  totalPages: number = 0;

  // Export Modal state
  exportMode: 'DATE_RANGE' | 'ALL' = 'ALL';
  exportStartDate: string = '';
  exportEndDate: string = '';
  exporting: boolean = false;

  // Menu Modal State (Popup Kelola Menu & Potensi)
  selectedPotensi: PbjtPotensi | null = null;
  menuModalItems: MenuItem[] = [];
  openingDaysEdit: number = 30;
  savingMenuModal: boolean = false;
  masterMenus: MasterMenu[] = [];
  calcModalPreview = {
    avgFood: 0,
    avgBev: 0,
    spendPerPerson: 0,
    dailyVisitors: 0,
    monthlyRevenue: 0,
    monthlyPbjt: 0,
    annualPbjt: 0
  };

  // Observation Modal State (Popup Observasi Lapangan Potensi)
  selectedPotensiObs: PbjtPotensi | null = null;
  observationList: PotensiObservation[] = [];
  loadingObservations: boolean = false;
  savingObservation: boolean = false;
  deletingObservationId: number | null = null;

  // Form Input Observasi Baru
  newObsDate: string = '';
  newObsTipeWaktu: string = 'PEAK';
  newObsVisitors: number = 30;
  newObsDuration: number = 1.0;
  newObsCatatan: string = '';
  newObsPetugas: string = '';

  // Menu Selection for Observation
  obsMenuItems: { name: string; price: number; category: string; selected: boolean }[] = [];
  showAddMenuInline: boolean = false;
  inlineMenuName: string = '';
  inlineMenuCategory: string = 'FOOD';
  inlineMenuPrice: number = 0;

  // Live Preview Calculation for Observation
  calcObsPreview = {
    vph: 0,
    operatingHours: 14,
    dailyVisitors: 0,
    avgFood: 0,
    avgBev: 0,
    spendPerPerson: 0,
    monthlyRevenue: 0,
    monthlyPbjt: 0,
    annualPbjt: 0
  };

  // Current user
  currentUser: any = null;

  constructor(
    private potensiService: PbjtPotensiService,
    private router: Router,
    private modalService: NgbModal,
    private store: Store
  ) {}

  ngOnInit(): void {
    this.store.select(selectCurrentUser).subscribe(user => {
      this.currentUser = user;
    });

    // Default dates for export (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    this.exportStartDate = this.formatDate(firstDay);
    this.exportEndDate = this.formatDate(today);

    this.loadPotensiList();
    this.loadMasterMenus();
  }

  isAdmin(): boolean {
    if (!this.currentUser) return false;
    const role = Array.isArray(this.currentUser.roles_name)
      ? this.currentUser.roles_name[0]
      : (this.currentUser.role || this.currentUser.roles_name || '');
    return !!(role && role.toUpperCase().includes('ADMIN'));
  }

  getCurrentUsername(): string {
    return this.currentUser?.username || this.currentUser?.nama || '';
  }

  goToPendataan(item: PbjtPotensi): void {
    if (!item || !item.id) return;
    this.router.navigate(['/pbjt-makanan/pendataan'], { queryParams: { potensiId: item.id } });
  }

  loadPotensiList(): void {
    this.loading = true;
    this.error = '';
    const surveyorFilter = this.isAdmin() ? undefined : this.getCurrentUsername();
    this.potensiService.getPotensiList(this.currentPage, this.pageSize, this.searchTerm, surveyorFilter).subscribe({
      next: (res) => {
        if (res && res.success) {
          this.potensiList = res.data || [];
          this.totalElements = res.totalElements || 0;
          this.totalPages = res.totalPages || 0;
        } else {
          this.potensiList = [];
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading potensi list:', err);
        this.error = 'Gagal memuat data Potensi PBJT.';
        this.loading = false;
      }
    });
  }

  loadMasterMenus(): void {
    this.potensiService.getMasterMenus().subscribe({
      next: (res) => {
        if (res && res.success) {
          this.masterMenus = res.data || [];
        }
      },
      error: (err) => console.error('Error fetching master menus:', err)
    });
  }

  onSearch(): void {
    this.currentPage = 0;
    this.loadPotensiList();
  }

  onPageChange(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadPotensiList();
    }
  }

  createNew(): void {
    this.router.navigate(['/pbjt-makanan/potensi/create']);
  }

  editPotensi(item: PbjtPotensi): void {
    this.router.navigate(['/pbjt-makanan/potensi/edit', item.id]);
  }

  viewDetail(item: PbjtPotensi): void {
    this.router.navigate(['/pbjt-makanan/potensi/detail', item.id]);
  }

  viewOnGoogleMaps(item: PbjtPotensi): void {
    if (item.latitude && item.longitude) {
      const url = `https://www.google.com/maps?q=${item.latitude},${item.longitude}`;
      window.open(url, '_blank');
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Koordinat Tidak Tersedia',
        text: 'Objek potensi ini belum memiliki data koordinat Latitude dan Longitude.',
        confirmButtonColor: '#155034'
      });
    }
  }

  deletePotensi(item: PbjtPotensi): void {
    if (!item.id) return;
    Swal.fire({
      title: 'Hapus Data Potensi?',
      html: `Apakah Anda yakin ingin menghapus potensi usaha <b>${item.namaUsaha}</b> (${item.kodePotensi})?<br><small class="text-danger">Seluruh data profil, menu, dan riwayat observasi terkait juga akan terhapus.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="ri-delete-bin-line me-1"></i> Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        this.potensiService.deletePotensi(item.id!).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Berhasil Dihapus!',
              text: `Data potensi "${item.namaUsaha}" telah berhasil dihapus.`,
              confirmButtonColor: '#155034'
            });
            this.loadPotensiList();
          },
          error: (err) => {
            console.error('Error deleting potensi:', err);
            Swal.fire({
              icon: 'error',
              title: 'Gagal Menghapus Data',
              text: err.error?.message || err.message || 'Terjadi kesalahan sistem saat menghapus potensi.',
              confirmButtonColor: '#155034'
            });
          }
        });
      }
    });
  }

  // ================= POPUP MODAL: KELOLA MENU & POTENSI =================

  openMenuModal(potensi: PbjtPotensi): void {
    this.selectedPotensi = { ...potensi };
    this.openingDaysEdit = potensi.openingDaysPerMonth || 30;
    this.menuModalItems = [];

    if (potensi.menuItems && potensi.menuItems.length > 0) {
      this.menuModalItems = potensi.menuItems.map(m => ({ ...m }));
    } else {
      this.addMenuModalItem();
    }

    this.calculateModalEstimates();
    this.loadMasterMenus();

    this.modalService.open(this.menuModalTemplate, {
      size: 'xl',
      centered: true,
      backdrop: 'static'
    });
  }

  addMenuModalItem(name: string = '', price: number = 0, category: string = 'FOOD'): void {
    this.menuModalItems.push({
      name: name,
      price: price,
      category: category
    });
    this.calculateModalEstimates();
  }

  removeMenuModalItem(index: number): void {
    if (this.menuModalItems.length > 1) {
      this.menuModalItems.splice(index, 1);
    } else {
      this.menuModalItems[0] = { name: '', price: 0, category: 'FOOD' };
    }
    this.calculateModalEstimates();
  }

  onModalMenuNameSelected(index: number, event: any): void {
    const val = event.target.value;
    const match = this.masterMenus.find(m => m.namaMenu.toLowerCase() === val.toLowerCase().trim());
    if (match) {
      this.menuModalItems[index].category = match.kategori || 'FOOD';
      this.menuModalItems[index].price = match.defaultHarga || 0;
      this.calculateModalEstimates();
    }
  }

  calculateModalEstimates(): void {
    if (!this.selectedPotensi) return;

    const foodPrices: number[] = [];
    const bevPrices: number[] = [];

    for (const item of this.menuModalItems) {
      if (item.name && item.price && item.price > 0) {
        if (item.category === 'BEVERAGE') {
          bevPrices.push(Number(item.price));
        } else {
          foodPrices.push(Number(item.price));
        }
      }
    }

    const avgFood = foodPrices.length > 0 ? (foodPrices.reduce((a, b) => a + b, 0) / foodPrices.length) : 0;
    const avgBev = bevPrices.length > 0 ? (bevPrices.reduce((a, b) => a + b, 0) / bevPrices.length) : 0;
    const spendPerPerson = avgFood + avgBev;

    const capacity = Number(this.selectedPotensi.kapasitasKursi) || 25;
    const turnoverRate = 2.0;

    const openTime = this.selectedPotensi.jamBuka || '08:00';
    const closeTime = this.selectedPotensi.jamTutup || '21:00';
    const [h1, m1] = openTime.split(':').map(Number);
    const [h2, m2] = closeTime.split(':').map(Number);
    const totalHours = Math.max(1, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
    const hoursFactor = Math.max(0.5, totalHours / 8.0);

    let locScore = 1.0;
    if (this.selectedPotensi.nearSchool) locScore += 0.10;
    if (this.selectedPotensi.nearOffice) locScore += 0.15;
    if (this.selectedPotensi.nearMarket) locScore += 0.12;
    const road = this.selectedPotensi.roadType || '';
    if (road === 'ARTERI') locScore += 0.20;
    else if (road === 'KOLEKTOR') locScore += 0.15;
    else if (road === 'LOKAL') locScore += 0.05;
    if (locScore > 1.50) locScore = 1.50;

    let typeCoeff = 1.0;
    const tipe = this.selectedPotensi.tipeUsaha;
    if (tipe === 'WARUNG_KECIL') typeCoeff = 0.85;
    else if (tipe === 'RUMAH_MAKAN') typeCoeff = 1.00;
    else if (tipe === 'RESTAURANT') typeCoeff = 1.10;
    else if (tipe === 'CAFE_MODERN') typeCoeff = 1.20;
    else if (tipe === 'FRANCHISE') typeCoeff = 1.15;

    let crowdMult = 1.0;
    const crowd = this.selectedPotensi.crowdLevel;
    if (crowd === 'SEPI') crowdMult = 0.5;
    else if (crowd === 'RAMAI') crowdMult = 1.5;

    const dailyVisitors = Math.round(capacity * turnoverRate * hoursFactor * locScore * typeCoeff * crowdMult);
    const openingDays = Number(this.openingDaysEdit) || 30;

    const monthlyRevenue = Math.round(spendPerPerson * dailyVisitors * openingDays);
    const monthlyPbjt = Math.round(monthlyRevenue * 0.10);
    const annualPbjt = Math.round(monthlyPbjt * 12 * 1.03);

    this.calcModalPreview = {
      avgFood,
      avgBev,
      spendPerPerson,
      dailyVisitors,
      monthlyRevenue,
      monthlyPbjt,
      annualPbjt
    };
  }

  saveMenuModal(): void {
    if (!this.selectedPotensi || !this.selectedPotensi.id) return;

    const validItems = this.menuModalItems.filter(m => m.name && m.name.trim() !== '');
    if (validItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Menu Masih Kosong',
        text: 'Harap masukkan minimal 1 menu makanan atau minuman.',
        confirmButtonColor: '#155034'
      });
      return;
    }

    this.savingMenuModal = true;
    const username = this.currentUser?.username || this.currentUser?.nama || 'Petugas';

    const payload: PbjtPotensi = {
      ...this.selectedPotensi,
      openingDaysPerMonth: this.openingDaysEdit,
      menuItems: validItems
    };

    this.potensiService.updatePotensi(this.selectedPotensi.id, payload, username).subscribe({
      next: () => {
        this.savingMenuModal = false;
        this.modalService.dismissAll();
        Swal.fire({
          icon: 'success',
          title: 'Berhasil Disimpan!',
          text: 'Daftar menu dan estimasi potensi berhasil disimpan.',
          confirmButtonColor: '#155034'
        });
        this.loadPotensiList();
        this.loadMasterMenus();
      },
      error: (err) => {
        this.savingMenuModal = false;
        console.error('Error saving menu modal:', err);
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menyimpan Menu',
          text: err.error?.message || err.message,
          confirmButtonColor: '#155034'
        });
      }
    });
  }

  // ================= MODAL EXPORT EXCEL =================

  openExportModal(): void {
    this.modalService.open(this.exportModalTemplate, { centered: true, size: 'md' });
  }

  executeExport(): void {
    this.exporting = true;
    const start = this.exportMode === 'DATE_RANGE' ? this.exportStartDate : undefined;
    const end = this.exportMode === 'DATE_RANGE' ? this.exportEndDate : undefined;
    const surveyorFilter = this.isAdmin() ? undefined : this.getCurrentUsername();

    this.potensiService.getPotensiForExport(start, end, surveyorFilter).subscribe({
      next: (res) => {
        this.exporting = false;
        if (!res.success || !res.data || res.data.length === 0) {
          Swal.fire({
            icon: 'info',
            title: 'Data Tidak Ditemukan',
            text: 'Tidak ada data potensi yang sesuai kriteria untuk diekspor.',
            confirmButtonColor: '#155034'
          });
          return;
        }

        const excelRows = res.data.map((item, index) => {
          const menuList = (item.menuItems || []).map((m: any) => {
            const qtyStr = m.qty ? `${m.qty}x ` : '';
            return `${qtyStr}${m.name} (Rp ${(m.price || 0).toLocaleString('id-ID')})`;
          }).join('\n');

          return {
            'No': index + 1,
            'Kode Potensi': item.kodePotensi || '',
            'Nama Usaha': item.namaUsaha || '',
            'Tipe Usaha': this.getBusinessTypeDisplay(item.tipeUsaha),
            'Tanggal Pendataan': item.tanggalPendataan || '',
            'Kapasitas Kursi': item.kapasitasKursi || 0,
            'Alamat': item.alamat || '',
            'Kelurahan': item.kelurahan || '',
            'Kecamatan': item.kecamatan || '',
            'Kabupaten': item.kabupaten || 'Lumajang',
            'Jumlah Item Menu': item.menuItems?.length || 0,
            'Rincian Menu': menuList,
            'Estimasi Omzet Bulanan': item.omzetBulanan || 0,
            'Estimasi PBJT Bulanan': item.pbjtBulanan || 0,
            'Estimasi PBJT Tahunan': item.pbjtTahunan || 0,
            'Surveyor / Petugas': item.surveyorId || '',
            'Catatan': item.notes || ''
          };
        });

        const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelRows);
        worksheet['!cols'] = [
          { wch: 6 },   // No
          { wch: 18 },  // Kode Potensi
          { wch: 28 },  // Nama Usaha
          { wch: 16 },  // Tipe Usaha
          { wch: 18 },  // Tanggal Pendataan
          { wch: 16 },  // Kapasitas Kursi
          { wch: 30 },  // Alamat
          { wch: 18 },  // Kelurahan
          { wch: 18 },  // Kecamatan
          { wch: 16 },  // Kabupaten
          { wch: 18 },  // Jumlah Item Menu
          { wch: 35 },  // Rincian Menu
          { wch: 24 },  // Estimasi Omzet Bulanan
          { wch: 24 },  // Estimasi PBJT Bulanan
          { wch: 24 },  // Estimasi PBJT Tahunan
          { wch: 20 },  // Surveyor
          { wch: 30 }   // Catatan
        ];

        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:Q1');
        for (let R = range.s.r; R <= range.e.r; ++R) {
          for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = worksheet[cellAddress];
            if (cell) {
              if (!cell.s) cell.s = {};
              cell.s.alignment = {
                vertical: 'center',
                wrapText: true
              };
            }
          }
        }

        const workbook: XLSX.WorkBook = XLSX.utils.book_new();
        const sheetName = this.isAdmin() ? 'Semua Potensi PBJT' : 'Potensi ' + this.getCurrentUsername();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const filterSuffix = this.isAdmin() ? '_Semua' : `_User_${this.getCurrentUsername()}`;
        const filename = `Data_Potensi_PBJT_${stamp}${filterSuffix}.xlsx`;

        XLSX.writeFile(workbook, filename);
        this.modalService.dismissAll();
      },
      error: (err) => {
        this.exporting = false;
        console.error('Error during excel export:', err);
        alert('Gagal mengekspor data Excel.');
      }
    });
  }

  // ================= BERITA ACARA =================

  isUserRole(): boolean {
    if (!this.currentUser) return false;
    const role = Array.isArray(this.currentUser.roles_name)
      ? this.currentUser.roles_name[0]
      : (this.currentUser.role || this.currentUser.roles_name || '');
    return role && role.toUpperCase() === 'USER';
  }

  openSignatureModal(potensi: any, modalTemplate: any): void {
    this.selectedPotensiForPrint = potensi;

    // 1. Nama Wajib Pajak:
    if (this.isUserRole()) {
      this.wpName = '';
    } else {
      this.wpName = potensi.namaUsaha || potensi.businessName || '';
    }

    // 2. Nama Petugas Pemeriksa:
    if (this.currentUser) {
      const role = Array.isArray(this.currentUser.roles_name)
        ? this.currentUser.roles_name[0]
        : (this.currentUser.role || this.currentUser.roles_name || '');

      if (role && !role.toLowerCase().includes('admin')) {
        this.petugasName = this.currentUser.nama || this.currentUser.name || this.currentUser.username || potensi.surveyorId || '';
      } else {
        this.petugasName = '';
      }
    } else {
      this.petugasName = potensi.surveyorId || '';
    }

    // Hitung rata-rata tarif menu dari potensi jika ada
    let avgMenuPrice = 0;
    if (potensi.menuItems && potensi.menuItems.length > 0) {
      const sum = potensi.menuItems.reduce((acc: number, item: any) => acc + (Number(item.price) || 0), 0);
      avgMenuPrice = Math.round(sum / potensi.menuItems.length);
    }

    // Inisialisasi default field Berita Acara
    this.baNoSuratPerintah = '';
    this.baTanggal = potensi.tanggalPendataan ? potensi.tanggalPendataan.substring(0, 10) : '';
    this.baNip = '';
    this.baNik = '';
    this.baTelp = '';
    this.baBertindakSelaku = 'Wajib Pajak';
    this.baTarifMenu = avgMenuPrice || null;
    this.baPengunjungWeekend = null;
    this.baPengunjungBiasa = null;
    this.baPengunjungRata = null;
    this.baSudahPbjt = false;
    this.baSetujuPajak = true;
    this.baAlasanTidakSetuju = '';

    this.modalService.open(modalTemplate, { size: 'lg', backdrop: 'static' }).result.then(
      (result) => {
        if (result === 'generate') {
          const wpCanvas = document.getElementById('potensiWpCanvas') as HTMLCanvasElement;
          const petugasCanvas = document.getElementById('potensiPetugasCanvas') as HTMLCanvasElement;

          const wpSig = this.wpSignaturePad && !this.wpSignaturePad.isEmpty() ? this.trimCanvas(wpCanvas || (this.wpSignaturePad as any).canvas) : null;
          const petugasSig = this.petugasSignaturePad && !this.petugasSignaturePad.isEmpty() ? this.trimCanvas(petugasCanvas || (this.petugasSignaturePad as any).canvas) : null;
          this.generatePrintBeritaAcara(this.selectedPotensiForPrint, wpSig, petugasSig);
        }
      },
      () => {}
    );

    setTimeout(() => {
      const canvasWp = document.getElementById('potensiWpCanvas') as HTMLCanvasElement;
      const canvasPetugas = document.getElementById('potensiPetugasCanvas') as HTMLCanvasElement;

      const signatureConfig = {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        minWidth: 2.5,
        maxWidth: 5.5,
        penColor: 'black'
      };

      if (canvasWp) {
        this.wpSignaturePad = new SignaturePad(canvasWp, signatureConfig);
      }
      if (canvasPetugas) {
        this.petugasSignaturePad = new SignaturePad(canvasPetugas, signatureConfig);
      }
    }, 200);
  }

  clearWpSignature(): void {
    if (this.wpSignaturePad) this.wpSignaturePad.clear();
  }

  clearPetugasSignature(): void {
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

    for (i = 0; i < l; i += 4) {
      if (pixels.data[i + 3] !== 0) {
        x = (i / 4) % canvas.width;
        y = ~~((i / 4) / canvas.width);

        if (bound.top === null) { bound.top = y; }
        if (bound.left === null) { bound.left = x; } else if (x < bound.left) { bound.left = x; }
        if (bound.right === null) { bound.right = x; } else if (bound.right < x) { bound.right = x; }
        if (bound.bottom === null) { bound.bottom = y; } else if (bound.bottom < y) { bound.bottom = y; }
      }
    }

    if (bound.top === null) {
      return null;
    }

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

    return copy.canvas.toDataURL();
  }

  generatePrintBeritaAcara(potensi: any, wpSignatureData: string | null, petugasSignatureData: string | null): void {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      Swal.fire({
        icon: 'warning',
        title: 'Pop-up Diblokir',
        text: 'Gagal membuka pop-up untuk cetak Berita Acara. Harap izinkan pop-up di browser Anda.',
        confirmButtonColor: '#155034'
      });
      return;
    }

    const hasValue = (value: string | number | null | undefined): boolean => {
      return typeof value === 'number' ? Number.isFinite(value) : !!value?.trim();
    };
    const formatCurrency = (val: number | null | undefined) => {
      if (val == null || !Number.isFinite(val)) return '';
      return new Intl.NumberFormat('id-ID').format(val);
    };

    const getTanggalIndo = () => {
      const date = new Date(potensi.tanggalPendataan || new Date());
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

    const businessTitle = potensi.namaUsaha || potensi.businessName || 'Lumajang';
    const businessAddress = potensi.alamat || (potensi.location ? potensi.location.address : '') || '.........................................................................................';
    const seatingCount = potensi.kapasitasKursi || potensi.seatingCapacity || '......';
    const openingDays = potensi.openingDaysPerMonth || 30;
    const nomorSuratPerintah = hasValue(this.baNoSuratPerintah)
      ? `Nomor: ${this.baNoSuratPerintah.trim()}`
      : '';
    const tanggalSuratPerintah = hasValue(this.baTanggal)
      ? `tanggal ${new Date(this.baTanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`
      : '';
    const suratPerintah = [nomorSuratPerintah, tanggalSuratPerintah].filter(Boolean).join(' ');
    const visitorRows = [
      { label: '- Jumlah pengunjung pada hari weekend dan hari libur nasional', value: this.baPengunjungWeekend },
      { label: '- Jumlah pengunjung pada hari biasa', value: this.baPengunjungBiasa },
      { label: '- Jumlah rata-rata pengunjung dalam 1 (satu) bulan', value: this.baPengunjungRata }
    ].filter(row => hasValue(row.value));

    const htmlContent = `
      <html>
        <head>
          <title>Berita Acara - ${businessTitle}</title>
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
              @page { size: A4; margin: 0; }
              body { padding: 15mm; margin: 0; }
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
            Pada hari ini <strong>${tglInfo.hari}</strong>, tanggal <strong>${tglInfo.tgl}</strong> bulan <strong>${tglInfo.bln}</strong> tahun <strong>${tglInfo.thn}</strong>${suratPerintah ? ` berdasarkan Surat Perintah ${suratPerintah}` : ''}, kami yang tersebut di bawah ini :
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
              <td>${this.petugasName || '.........................................................'}${hasValue(this.baNip) ? `<br>NIP. ${this.baNip.trim()}` : ''}</td>
              <td>Petugas Pajak</td>
            </tr>
          </table>

          <p style="margin-bottom: 5px;">telah melakukan pertemuan guna kepentingan konfirmasi, cek fisik dan pendataan potensi obyek pajak dengan :</p>

          <!-- DATA WAJIB PAJAK -->
          <table class="info-mejo">
            <tr><td class="col-noo">Nama</td><td class="col-colan">:</td><td>${this.wpName || '.........................................................................................'}</td></tr>
            ${hasValue(this.baNip) ? `<tr><td>N.I.P</td><td>:</td><td>${this.baNip.trim()}</td></tr>` : ''}
            ${hasValue(this.baNik) ? `<tr><td>N.I.K</td><td>:</td><td>${this.baNik.trim()}</td></tr>` : ''}
            <tr><td>Nama Obyek Usaha</td><td>:</td><td>${businessTitle}</td></tr>
            <tr><td>Alamat obyek Usaha</td><td>:</td><td>${businessAddress}</td></tr>
            ${hasValue(this.baTelp) ? `<tr><td>Nomor Telp</td><td>:</td><td>${this.baTelp.trim()}</td></tr>` : ''}
          </table>

          <div class="checkbox-group">
            <span style="margin-right: 15px;">Dalam hal ini bertindak selaku :</span>
            <div class="checkbox-item"><span class="checkbox-box">${this.baBertindakSelaku === 'Wajib Pajak' ? 'v' : ' '}</span> Wajib Pajak</div>
            <div class="checkbox-item"><span class="checkbox-box">${this.baBertindakSelaku === 'Wakil' ? 'v' : ' '}</span> Wakil</div>
            <div class="checkbox-item"><span class="checkbox-box">${this.baBertindakSelaku === 'Kuasa' ? 'v' : ' '}</span> Kuasa</div>
          </div>

          <p style="margin-bottom: 5px;">untuk :</p>
          <ol>
            <li>Menjelaskan alasan dan tujuan dilaksanakan pendataan, pendaftaran dan penilaian potensi obyek pajak baru;</li>
            <li>Mengedukasi dan mensosialisasikan tentang PBJT Penjualan dan/atau Penyerahan Makanan dan/atau Minuman;</li>
            <li>Mendata potensi dan mendaftarkan atas obyek PBJT Penjualan dan/atau Penyerahan Makanan dan/atau Minuman dengan informasi sebagai berikut :
              <ol class="sub-list">
                <li class="no-bullet"><span class="checkbox-box">v</span> Restoran/Rumah Makan/Warung/Kafe/Kantin</li>
                <li class="no-bullet"><span class="checkbox-box"></span> Penyedia Jasa Boga / Katering</li>
                <li>Jumlah fasilitas Meja/Kursi/Kapasitas duduk : <strong>${seatingCount}</strong> orang/meja/kursi</li>
                ${hasValue(this.baTarifMenu) ? `<li>Tarif menu makanan/minuman rata-rata sebesar Rp. <strong>${formatCurrency(this.baTarifMenu)}</strong></li>` : ''}
                <li>Jumlah hari operasional usaha dalam sebulan : <strong>${openingDays}</strong> hari</li>
                ${visitorRows.length ? `<li>Transaksi penjualan dan / atau jumlah pengunjung 1 (satu) bulan, sebagai berikut :
                  <table class="info-mejo" style="margin-top: 5px; width: 95%;">
                    ${visitorRows.map((row, index) => `<tr><td ${index === 0 ? 'style="width: 75%;"' : ''}>${row.label}</td><td ${index === 0 ? 'style="width: 2%;"' : ''}>:</td><td>${row.value} orang</td></tr>`).join('')}
                  </table>
                </li>` : ''}
                <li>Pemilik usaha dan pengelola sudah menerapkan PBJT 10% :
                  <div class="checkbox-group" style="margin-top: 5px; margin-bottom: 0;">
                    <div class="checkbox-item"><span class="checkbox-box">${this.baSudahPbjt ? 'v' : ' '}</span> Sudah</div>
                    <div class="checkbox-item"><span class="checkbox-box">${!this.baSudahPbjt ? 'v' : ' '}</span> Belum</div>
                  </div>
                </li>
                <li>Wajib Pajak telah ${this.baSetujuPajak ? 'MENYETUJUI' : '<del>MENYETUJUI</del>'} dan/atau ${this.baSetujuPajak ? 'BERSEDIA' : '<del>BERSEDIA</del>'} dipungut pajak mulai bulan ................................ tahun 2026.</li>
                ${hasValue(this.baAlasanTidakSetuju) ? `<li>Jika TIDAK SETUJU dan/atau TIDAK BERSEDIA dipungut pajak daerah, dengan alasan sebagai berikut:<br>
                    <strong>${this.baAlasanTidakSetuju.trim()}</strong><br>
                    dan bersedia menanggung sanksi sesuai peraturan perundang-undangan yang berlaku.
                </li>` : ''}
              </ol>
            </li>
          </ol>

          <!-- PARAGRAF PENUTUP -->
          <p style="text-indent: 40px; text-align: justify; margin-top: 15px; margin-bottom: 10px;">
            Demikian Berita Acara Pendataan, Pendaftaran dan Penilaian obyek dan Wajib Pajak ini dibuat dengan sebenarnya dan ditanda tangani oleh:
          </p>

          <!-- TANDA TANGAN -->
          <div class="signature-area-ba" ${this.isUserRole() ? 'style="justify-content: flex-end;"' : ''}>
            ${!this.isUserRole() ? `
            <div class="signature-box-ba">
              <p style="margin: 0;">Wajib Pajak/Wakil/Kuasa</p>
              ${wpSignatureData ? '<img src="' + wpSignatureData + '" class="signature-img-ba"/>' : '<br><br><br><br>'}
              <p style="margin: 0;"><strong>${this.wpName || '....................................................'}</strong></p>
            </div>
            ` : ''}
            
            <div class="signature-box-ba">
              <p style="margin: 0;">Petugas Pajak</p>
              ${petugasSignatureData ? '<img src="' + petugasSignatureData + '" class="signature-img-ba"/>' : '<br><br><br><br>'}
              <p style="margin: 0;"><strong>${this.petugasName || '....................................................'}</strong></p>
              ${hasValue(this.baNip) ? `<p style="margin: 5px 0 0 0;">NIP. ${this.baNip.trim()}</p>` : ''}
            </div>
          </div>

          <p style="font-size: 9pt; font-style: italic; margin-top: 10px;">*) coret yang tidak perlu</p>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  getBusinessTypeDisplay(type?: string): string {
    if (!type) return '-';
    switch (type.toUpperCase()) {
      case 'WARUNG_KECIL': return 'Warung Kecil';
      case 'RUMAH_MAKAN': return 'Rumah Makan';
      case 'RESTAURANT': return 'Restaurant';
      case 'CAFE_MODERN': return 'Café Modern';
      case 'FRANCHISE': return 'Franchise';
      default: return type;
    }
  }

  formatCurrency(value?: number): string {
    if (!value || isNaN(value)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  private formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ================= POPUP MODAL: OBSERVASI POTENSI =================

  openObservationModal(potensi: PbjtPotensi): void {
    this.selectedPotensiObs = potensi;

    // Set default datetime to now in local ISO format (YYYY-MM-DDTHH:mm)
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    this.newObsDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    this.newObsTipeWaktu = 'PEAK';
    this.newObsVisitors = potensi.kapasitasKursi ? Math.round(potensi.kapasitasKursi * 0.8) : 30;
    this.newObsDuration = 1.0;
    this.newObsCatatan = '';
    this.newObsPetugas = this.currentUser?.username || this.currentUser?.nama || 'Petugas';
    this.showAddMenuInline = false;
    this.inlineMenuName = '';
    this.inlineMenuCategory = 'FOOD';
    this.inlineMenuPrice = 0;

    // Populate menu items from potensi (default all selected)
    if (potensi.menuItems && potensi.menuItems.length > 0) {
      this.obsMenuItems = potensi.menuItems.map(m => ({
        name: m.name,
        price: m.price,
        category: m.category || 'FOOD',
        selected: true
      }));
    } else {
      this.obsMenuItems = [];
    }

    this.calculateObsLivePreview();

    // Fetch existing observations
    if (potensi.id) {
      this.loadObservationsForPotensi(potensi.id);
    }

    this.modalService.open(this.observationModalTemplate, {
      size: 'xl',
      centered: true,
      scrollable: true
    });
  }

  loadObservationsForPotensi(potensiId: number): void {
    this.loadingObservations = true;
    this.potensiService.getObservations(potensiId).subscribe({
      next: (res) => {
        this.observationList = res.data || [];
        this.loadingObservations = false;
      },
      error: (err) => {
        this.loadingObservations = false;
        console.error('Error fetching observations:', err);
      }
    });
  }

  calculateObsLivePreview(): void {
    if (!this.selectedPotensiObs) return;

    const visitors = Number(this.newObsVisitors) || 0;
    const duration = Number(this.newObsDuration) || 1.0;
    const vph = duration > 0 ? (visitors / duration) : visitors;

    // Calculate operating hours
    let opHours = 14;
    if (this.selectedPotensiObs.jamBuka && this.selectedPotensiObs.jamTutup) {
      const [bukaH, bukaM] = this.selectedPotensiObs.jamBuka.split(':').map(Number);
      const [tutupH, tutupM] = this.selectedPotensiObs.jamTutup.split(':').map(Number);
      const bukaMins = (bukaH || 8) * 60 + (bukaM || 0);
      const tutupMins = (tutupH || 22) * 60 + (tutupM || 0);
      let diffMins = tutupMins - bukaMins;
      if (diffMins <= 0) diffMins += 24 * 60;
      opHours = Math.max(1, diffMins / 60);
    }

    const dailyVisitors = Math.round(vph * opHours);

    // Selected menus
    const selected = this.obsMenuItems.filter(m => m.selected);
    const foodPrices: number[] = [];
    const bevPrices: number[] = [];

    for (const item of selected) {
      const p = Number(item.price) || 0;
      if (p > 0) {
        if (item.category === 'BEVERAGE') {
          bevPrices.push(p);
        } else {
          foodPrices.push(p);
        }
      }
    }

    const avgFood = foodPrices.length > 0 ? (foodPrices.reduce((a, b) => a + b, 0) / foodPrices.length) : 0;
    const avgBev = bevPrices.length > 0 ? (bevPrices.reduce((a, b) => a + b, 0) / bevPrices.length) : 0;
    const spendPerPerson = avgFood + avgBev;

    const openingDays = Number(this.selectedPotensiObs.openingDaysPerMonth) || 30;
    const monthlyRevenue = Math.round(spendPerPerson * dailyVisitors * openingDays);
    const monthlyPbjt = Math.round(monthlyRevenue * 0.10);
    const annualPbjt = monthlyPbjt * 12;

    this.calcObsPreview = {
      vph: Math.round(vph * 10) / 10,
      operatingHours: Math.round(opHours * 10) / 10,
      dailyVisitors,
      avgFood: Math.round(avgFood),
      avgBev: Math.round(avgBev),
      spendPerPerson: Math.round(spendPerPerson),
      monthlyRevenue,
      monthlyPbjt,
      annualPbjt
    };
  }

  toggleObsMenuSelection(index: number): void {
    if (this.obsMenuItems[index]) {
      this.obsMenuItems[index].selected = !this.obsMenuItems[index].selected;
      this.calculateObsLivePreview();
    }
  }

  toggleSelectAllObsMenus(select: boolean): void {
    this.obsMenuItems.forEach(m => m.selected = select);
    this.calculateObsLivePreview();
  }

  getSelectedObsMenuCount(): number {
    return this.obsMenuItems ? this.obsMenuItems.filter(m => m.selected).length : 0;
  }

  addInlineMenu(): void {
    if (!this.inlineMenuName || !this.inlineMenuName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Nama Menu Kosong',
        text: 'Nama menu wajib diisi.',
        confirmButtonColor: '#155034'
      });
      return;
    }
    if (!this.inlineMenuPrice || this.inlineMenuPrice <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Harga Tidak Valid',
        text: 'Harga menu harus lebih dari Rp 0.',
        confirmButtonColor: '#155034'
      });
      return;
    }

    this.obsMenuItems.push({
      name: this.inlineMenuName.trim(),
      category: this.inlineMenuCategory,
      price: Number(this.inlineMenuPrice),
      selected: true
    });

    this.inlineMenuName = '';
    this.inlineMenuPrice = 0;
    this.showAddMenuInline = false;
    this.calculateObsLivePreview();
  }

  saveObservation(): void {
    if (!this.selectedPotensiObs || !this.selectedPotensiObs.id) return;

    if (!this.newObsVisitors || this.newObsVisitors <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Pengunjung Kosong',
        text: 'Jumlah pengunjung wajib diisi minimal 1 orang.',
        confirmButtonColor: '#155034'
      });
      return;
    }

    if (!this.newObsDuration || this.newObsDuration <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Durasi Tidak Valid',
        text: 'Durasi observasi wajib diisi minimal 0.5 jam.',
        confirmButtonColor: '#155034'
      });
      return;
    }

    const selectedMenus = this.obsMenuItems
      .filter(m => m.selected)
      .map(m => ({ name: m.name, price: m.price, category: m.category }));

    const payload: PotensiObservation = {
      potensiId: this.selectedPotensiObs.id,
      tanggalObservasi: this.newObsDate,
      tipeWaktu: this.newObsTipeWaktu,
      jumlahPengunjung: Number(this.newObsVisitors),
      durasiJam: Number(this.newObsDuration),
      menuItems: selectedMenus,
      petugas: this.newObsPetugas,
      catatan: this.newObsCatatan
    };

    this.savingObservation = true;
    const username = this.currentUser?.username || this.currentUser?.nama || 'Petugas';

    this.potensiService.addObservation(this.selectedPotensiObs.id, payload, username).subscribe({
      next: () => {
        this.savingObservation = false;
        Swal.fire({
          icon: 'success',
          title: 'Observasi Berhasil Disimpan!',
          text: 'Data Observasi berhasil disimpan dan estimasi potensi pajak telah diperbarui otomatis.',
          confirmButtonColor: '#155034'
        });
        // Reload observations list
        this.loadObservationsForPotensi(this.selectedPotensiObs!.id!);
        // Refresh master potensi list to reflect new omzet & PBJT
        this.loadPotensiList();
        // Reset catatan
        this.newObsCatatan = '';
      },
      error: (err) => {
        this.savingObservation = false;
        console.error('Error saving observation:', err);
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menyimpan Observasi',
          text: err.error?.message || err.message,
          confirmButtonColor: '#155034'
        });
      }
    });
  }

  deleteObservation(obs: PotensiObservation): void {
    if (!obs.id) return;
    const tgl = obs.tanggalObservasi
      ? new Date(obs.tanggalObservasi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '';

    Swal.fire({
      title: 'Hapus Riwayat Survei?',
      html: `Apakah Anda yakin ingin menghapus data observasi <b>Survei Ke-${obs.surveyKe || ''}</b> (${tgl})?<br><small class="text-muted">Kalkulasi potensi pajak usaha ini akan dihitung ulang secara otomatis berdasarkan survei tersisa.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '<i class="ri-delete-bin-line me-1"></i> Ya, Hapus',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deletingObservationId = obs.id!;
        this.potensiService.deleteObservation(obs.id!).subscribe({
          next: () => {
            this.deletingObservationId = null;
            Swal.fire({
              icon: 'success',
              title: 'Berhasil Dihapus!',
              text: 'Riwayat survei berhasil dihapus dan potensi usaha telah diperbarui.',
              confirmButtonColor: '#155034'
            });
            if (this.selectedPotensiHistory && this.selectedPotensiHistory.id) {
              this.loadHistoryObservations(this.selectedPotensiHistory.id);
            }
            if (this.selectedPotensiObs && this.selectedPotensiObs.id) {
              this.loadObservationsForPotensi(this.selectedPotensiObs.id);
            }
            this.loadPotensiList();
          },
          error: (err) => {
            this.deletingObservationId = null;
            console.error('Error deleting observation:', err);
            Swal.fire({
              icon: 'error',
              title: 'Gagal Menghapus Observasi',
              text: err.error?.message || err.message,
              confirmButtonColor: '#155034'
            });
          }
        });
      }
    });
  }

  getTipeWaktuBadge(tipe?: string): { label: string; class: string } {
    switch (tipe?.toUpperCase()) {
      case 'PEAK':
      case 'RAMAI':
        return { label: 'Waktu Ramai (Peak)', class: 'bg-danger' };
      case 'OFF_PEAK':
      case 'SEPI':
        return { label: 'Waktu Sepi (Off-Peak)', class: 'bg-secondary' };
      default:
        return { label: 'Waktu Normal', class: 'bg-primary' };
    }
  }

  // ================= POPUP MODAL: RIWAYAT & KOMPARASI SURVEI =================

  openHistoryModal(potensi: PbjtPotensi): void {
    this.selectedPotensiHistory = potensi;
    this.historyList = [];
    this.activeHistoryTab = 'timeline';
    this.compareObsAId = null;
    this.compareObsBId = null;
    this.compareObsA = null;
    this.compareObsB = null;

    if (potensi.id) {
      this.loadHistoryObservations(potensi.id);
    }

    this.modalService.open(this.historyModalTemplate, {
      size: 'xl',
      centered: true,
      scrollable: true,
      backdrop: 'static'
    });
  }

  loadHistoryObservations(potensiId: number): void {
    this.loadingHistory = true;
    this.potensiService.getObservations(potensiId).subscribe({
      next: (res) => {
        this.historyList = res.data || [];
        this.loadingHistory = false;

        // Auto-select comparison defaults if we have at least 2 surveys
        // historyList is sorted newest first (descending)
        if (this.historyList.length >= 2) {
          this.compareObsB = this.historyList[0];
          this.compareObsBId = this.compareObsB.id || null;

          this.compareObsA = this.historyList[this.historyList.length - 1];
          this.compareObsAId = this.compareObsA.id || null;
        } else if (this.historyList.length === 1) {
          this.compareObsA = this.historyList[0];
          this.compareObsAId = this.compareObsA.id || null;
        }
      },
      error: (err) => {
        this.loadingHistory = false;
        console.error('Error fetching history observations:', err);
      }
    });
  }

  onSelectCompareA(idStr: any): void {
    const id = Number(idStr);
    this.compareObsAId = id;
    this.compareObsA = this.historyList.find(o => o.id === id) || null;
  }

  onSelectCompareB(idStr: any): void {
    const id = Number(idStr);
    this.compareObsBId = id;
    this.compareObsB = this.historyList.find(o => o.id === id) || null;
  }

  getDelta(valB?: number | null, valA?: number | null): number {
    const b = Number(valB) || 0;
    const a = Number(valA) || 0;
    return b - a;
  }

  getDeltaPercent(valB?: number | null, valA?: number | null): number | null {
    const b = Number(valB) || 0;
    const a = Number(valA) || 0;
    if (a === 0) {
      return b > 0 ? 100 : 0;
    }
    return Math.round(((b - a) / a) * 100);
  }

  getDeltaBadgeClass(valB?: number | null, valA?: number | null, inverse: boolean = false): string {
    const diff = this.getDelta(valB, valA);
    if (diff === 0) return 'badge bg-secondary-subtle text-secondary';
    if (diff > 0) {
      return inverse ? 'badge bg-danger-subtle text-danger' : 'badge bg-success-subtle text-success';
    }
    return inverse ? 'badge bg-success-subtle text-success' : 'badge bg-danger-subtle text-danger';
  }

  getDeltaIcon(valB?: number | null, valA?: number | null): string {
    const diff = this.getDelta(valB, valA);
    if (diff > 0) return 'ri-arrow-up-line';
    if (diff < 0) return 'ri-arrow-down-line';
    return 'ri-subtract-line';
  }

  getMenuCategoryCount(items?: any[]): { food: number; bev: number } {
    if (!items || !items.length) return { food: 0, bev: 0 };
    const food = items.filter(i => (i.category || 'FOOD').toUpperCase() === 'FOOD').length;
    const bev = items.filter(i => (i.category || '').toUpperCase() === 'BEVERAGE').length;
    return { food, bev };
  }
}
