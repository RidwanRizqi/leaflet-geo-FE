import { Component, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Store } from '@ngrx/store';
import { selectCurrentUser } from 'src/app/store/auth/auth.selector';
import { PbjtPotensiService } from '../../../services/pbjt-potensi.service';
import { MenuItem, PbjtPotensi, PotensiObservation } from '../../../models/potensi.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-potensi-pendataan',
  templateUrl: './potensi-pendataan.component.html',
  styleUrls: ['./potensi-pendataan.component.scss']
})
export class PotensiPendataanComponent implements OnInit {
  // Breadcrumb
  breadCrumbTitle: string = 'Pendataan & Observasi Lapangan';
  breadCrumbItems = [
    { label: 'PBJT Assessment' },
    { label: 'Potensi PBJT' },
    { label: 'Pendataan Lapangan', active: true }
  ];

  // User & Auth State
  currentUser: any = null;
  currentUsername: string = 'surveyor';
  isAdmin: boolean = false;

  // Selected Potensi PBJT
  potensiId: number | null = null;
  selectedPotensi: PbjtPotensi | null = null;
  loadingPotensi: boolean = false;
  potensiLoadError: string = '';

  // All Potensi for fallback selection (if no query param)
  allPotensiList: PbjtPotensi[] = [];
  isLoadingList: boolean = false;

  // Establishment Menu Catalog (from Potensi PBJT Tab 3)
  establishmentMenus: MenuItem[] = [];

  // Dropdown search state per row
  searchMenuQueries: string[] = [];
  filteredMenus: MenuItem[][] = [];
  activeDropdownIndex: number | null = null;

  // Form State
  pendataanForm!: FormGroup;
  submitted: boolean = false;
  submitting: boolean = false;

  // Photo Upload State (Maksimal 8 Foto)
  maxPhotos: number = 8;
  uploadedPhotos: { file: File; preview: string; name: string }[] = [];
  existingPhotos: string[] = [];
  isUploadingPhotos: boolean = false;

  // Live Summary Calculation
  calcSummary = {
    totalItems: 0,
    totalPorsi: 0,
    totalBelanja: 0,
    avgSpendPerPerson: 0,
    vph: 0,
    dailyVisitors: 0,
    monthlyRevenue: 0,
    monthlyPbjt: 0
  };

  categories = [
    { value: 'FOOD', label: 'Makanan' },
    { value: 'BEVERAGE', label: 'Minuman' },
    { value: 'SNACK', label: 'Camilan / Snack' },
    { value: 'PACKAGE', label: 'Paket Menu' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private potensiService: PbjtPotensiService,
    private store: Store
  ) {}

  ngOnInit(): void {
    this.store.select(selectCurrentUser).subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.currentUsername = user.username || user.nama || 'surveyor';
        const role = Array.isArray(user.roles_name)
          ? user.roles_name[0]
          : (user.role || user.roles_name || '');
        this.isAdmin = !!(role && role.toUpperCase().includes('ADMIN'));
      }
    });

    this.initForm();

    // Check query params for potensiId
    this.route.queryParams.subscribe(params => {
      const pId = params['potensiId'];
      if (pId) {
        this.potensiId = +pId;
        this.loadPotensiData(this.potensiId);
      } else {
        // Fallback: load all potensi list to let user choose
        this.loadAllPotensiList();
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-search-container')) {
      this.activeDropdownIndex = null;
    }
  }

  initForm(): void {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localIsoDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;

    this.pendataanForm = this.fb.group({
      potensiId: [null, Validators.required],
      namaWp: [{ value: '', disabled: true }, Validators.required],
      tanggalObservasi: [localIsoDate, Validators.required],
      tipeWaktu: ['PEAK', Validators.required],
      jumlahPengunjung: [20, [Validators.required, Validators.min(1)]],
      durasiJam: [1.0, [Validators.required, Validators.min(0.25)]],
      catatan: [''],
      orderItems: this.fb.array([])
    });

    // Add initial menu row
    this.addMenuRow();

    // Live calculation listeners
    this.pendataanForm.valueChanges.subscribe(() => {
      this.recalculate();
    });
  }

  get orderItems(): FormArray {
    return this.pendataanForm.get('orderItems') as FormArray;
  }

  addMenuRow(name: string = '', price: number = 0, category: string = 'FOOD', qty: number = 1): void {
    const subtotal = price * qty;
    const row = this.fb.group({
      name: [name, Validators.required],
      category: [category, Validators.required],
      price: [price, [Validators.required, Validators.min(0)]],
      qty: [qty, [Validators.required, Validators.min(1)]],
      subtotal: [subtotal]
    });

    this.orderItems.push(row);
    const newIdx = this.orderItems.length - 1;
    this.searchMenuQueries[newIdx] = name;
    this.filteredMenus[newIdx] = [...this.establishmentMenus];

    this.recalculate();
  }

  removeMenuRow(index: number): void {
    if (this.orderItems.length > 1) {
      this.orderItems.removeAt(index);
      this.searchMenuQueries.splice(index, 1);
      this.filteredMenus.splice(index, 1);
    } else {
      this.orderItems.at(0).reset({ name: '', price: 0, category: 'FOOD', qty: 1, subtotal: 0 });
      this.searchMenuQueries[0] = '';
      this.filteredMenus[0] = [...this.establishmentMenus];
    }
    this.recalculate();
  }

  // ==========================================
  // MENU SEARCH & DROPDOWN AUTOCOMPLETE
  // ==========================================

  onMenuSearchFocus(index: number): void {
    this.activeDropdownIndex = index;
    const q = (this.searchMenuQueries[index] || '').toLowerCase().trim();
    this.filterMenusForRow(index, q);
  }

  onMenuSearchInput(index: number, event: any): void {
    const q = event.target.value || '';
    this.searchMenuQueries[index] = q;
    this.activeDropdownIndex = index;
    this.filterMenusForRow(index, q.toLowerCase().trim());

    // Also update form row name
    const row = this.orderItems.at(index);
    row.patchValue({ name: q }, { emitEvent: false });
  }

  filterMenusForRow(index: number, query: string): void {
    if (!query) {
      this.filteredMenus[index] = [...this.establishmentMenus];
    } else {
      this.filteredMenus[index] = this.establishmentMenus.filter(m =>
        m.name.toLowerCase().includes(query) ||
        (m.category && m.category.toLowerCase().includes(query))
      );
    }
  }

  selectMenuItem(index: number, menu: MenuItem): void {
    const row = this.orderItems.at(index);
    const qty = row.get('qty')?.value || 1;
    const price = menu.price || 0;
    const category = menu.category || 'FOOD';

    row.patchValue({
      name: menu.name,
      price: price,
      category: category,
      subtotal: price * qty
    });

    this.searchMenuQueries[index] = menu.name;
    this.activeDropdownIndex = null;
    this.recalculate();
  }

  onQtyChange(index: number): void {
    const row = this.orderItems.at(index);
    const qty = Math.max(1, Number(row.get('qty')?.value) || 1);
    const price = Number(row.get('price')?.value) || 0;
    row.patchValue({ qty, subtotal: price * qty }, { emitEvent: false });
    this.recalculate();
  }

  onPriceChange(index: number): void {
    const row = this.orderItems.at(index);
    const qty = Number(row.get('qty')?.value) || 1;
    const price = Math.max(0, Number(row.get('price')?.value) || 0);
    row.patchValue({ price, subtotal: price * qty }, { emitEvent: false });
    this.recalculate();
  }

  // ==========================================
  // DATA LOADING
  // ==========================================

  loadPotensiData(id: number): void {
    this.loadingPotensi = true;
    this.potensiLoadError = '';

    this.potensiService.getPotensiById(id).subscribe({
      next: (res) => {
        this.loadingPotensi = false;
        if (res && res.success && res.data) {
          this.applyPotensi(res.data);
        } else {
          this.potensiLoadError = 'Data Potensi PBJT tidak ditemukan.';
        }
      },
      error: (err) => {
        this.loadingPotensi = false;
        console.error('Error fetching potensi details:', err);
        this.potensiLoadError = 'Gagal memuat data potensi: ' + (err.error?.message || err.message);
      }
    });
  }

  loadAllPotensiList(): void {
    this.isLoadingList = true;
    const surveyorFilter = this.isAdmin ? undefined : this.currentUsername;
    this.potensiService.getPotensiList(0, 100, '', surveyorFilter).subscribe({
      next: (res) => {
        this.isLoadingList = false;
        if (res && res.success) {
          this.allPotensiList = res.data || [];
        }
      },
      error: (err) => {
        this.isLoadingList = false;
        console.error('Error loading potensi list:', err);
      }
    });
  }

  onSelectPotensiFromDropdown(potensiIdStr: string): void {
    if (!potensiIdStr) return;
    const id = +potensiIdStr;
    const found = this.allPotensiList.find(p => p.id === id);
    if (found) {
      this.applyPotensi(found);
    } else {
      this.loadPotensiData(id);
    }
  }

  applyPotensi(potensi: PbjtPotensi): void {
    this.selectedPotensi = potensi;
    this.potensiId = potensi.id || null;

    // Patch form
    this.pendataanForm.patchValue({
      potensiId: potensi.id,
      namaWp: potensi.namaUsaha || ''
    });

    // Populate establishment menu catalog
    this.establishmentMenus = potensi.menuItems && potensi.menuItems.length > 0
      ? [...potensi.menuItems]
      : [];

    // Pre-populate existing photos if available
    this.existingPhotos = potensi.photoUrls && Array.isArray(potensi.photoUrls)
      ? [...potensi.photoUrls]
      : [];

    // Reset menu rows and pre-fill first row if establishment has menus
    while (this.orderItems.length > 0) {
      this.orderItems.removeAt(0);
    }
    this.searchMenuQueries = [];
    this.filteredMenus = [];

    if (this.establishmentMenus.length > 0) {
      const initialItem = this.establishmentMenus[0];
      this.addMenuRow(initialItem.name, initialItem.price, initialItem.category || 'FOOD', 1);
    } else {
      this.addMenuRow();
    }

    this.recalculate();
  }

  // ==========================================
  // PHOTO UPLOAD (Max 8 Photos)
  // ==========================================

  onPhotosSelected(event: any): void {
    const files: FileList = event.target.files;
    if (!files || files.length === 0) return;

    const currentTotal = this.uploadedPhotos.length + this.existingPhotos.length;
    const remainingSlots = this.maxPhotos - currentTotal;

    if (remainingSlots <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Batas Foto Tercapai',
        text: `Maksimal ${this.maxPhotos} foto lokasi yang dapat diunggah.`,
        confirmButtonColor: '#155034'
      });
      return;
    }

    const countToAdd = Math.min(files.length, remainingSlots);
    for (let i = 0; i < countToAdd; i++) {
      const file = files[i];
      if (file.type && !file.type.startsWith('image/')) {
        continue;
      }
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.uploadedPhotos.push({
          file: file,
          preview: e.target.result,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }

    if (files.length > remainingSlots) {
      Swal.fire({
        icon: 'info',
        title: 'Sebagian Foto Ditambahkan',
        text: `Hanya ${remainingSlots} foto yang ditambahkan karena batas maksimal ${this.maxPhotos} foto.`,
        confirmButtonColor: '#155034'
      });
    }

    // Reset input
    event.target.value = '';
  }

  removeUploadedPhoto(index: number): void {
    this.uploadedPhotos.splice(index, 1);
  }

  removeExistingPhoto(index: number): void {
    this.existingPhotos.splice(index, 1);
  }

  // ==========================================
  // RECALCULATION & LIVE PREVIEWS
  // ==========================================

  recalculate(): void {
    const rawItems: any[] = this.orderItems?.value || [];
    let totalItems = 0;
    let totalPorsi = 0;
    let totalBelanja = 0;

    const foodPrices: number[] = [];
    const bevPrices: number[] = [];

    for (const item of rawItems) {
      if (item.name && item.name.trim() !== '' && item.price !== null && item.price >= 0) {
        totalItems++;
        const qty = Number(item.qty) || 1;
        const price = Number(item.price) || 0;
        totalPorsi += qty;
        totalBelanja += price * qty;

        if (item.category === 'BEVERAGE') {
          bevPrices.push(price);
        } else {
          foodPrices.push(price);
        }
      }
    }

    const avgFood = foodPrices.length > 0 ? (foodPrices.reduce((a, b) => a + b, 0) / foodPrices.length) : 0;
    const avgBev = bevPrices.length > 0 ? (bevPrices.reduce((a, b) => a + b, 0) / bevPrices.length) : 0;
    const avgSpendPerPerson = avgFood + avgBev > 0 ? avgFood + avgBev : (totalPorsi > 0 ? totalBelanja / totalPorsi : 0);

    const visitors = Number(this.pendataanForm?.get('jumlahPengunjung')?.value) || 20;
    const duration = Number(this.pendataanForm?.get('durasiJam')?.value) || 1.0;
    const vph = duration > 0 ? Math.round(visitors / duration) : visitors;

    let opHours = 12;
    if (this.selectedPotensi && this.selectedPotensi.jamBuka && this.selectedPotensi.jamTutup) {
      const [h1, m1] = this.selectedPotensi.jamBuka.split(':').map(Number);
      const [h2, m2] = this.selectedPotensi.jamTutup.split(':').map(Number);
      opHours = Math.max(1, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
    }

    const dailyVisitors = Math.round(vph * (opHours * 0.75));
    const openDays = this.selectedPotensi?.openingDaysPerMonth || 30;
    const monthlyRevenue = Math.round(dailyVisitors * avgSpendPerPerson * openDays);
    const monthlyPbjt = Math.round(monthlyRevenue * 0.10);

    this.calcSummary = {
      totalItems,
      totalPorsi,
      totalBelanja,
      avgSpendPerPerson,
      vph,
      dailyVisitors,
      monthlyRevenue,
      monthlyPbjt
    };
  }

  // ==========================================
  // FORM SUBMISSION & REDIRECT
  // ==========================================

  onSubmit(): void {
    this.submitted = true;

    if (this.pendataanForm.invalid || !this.potensiId) {
      this.pendataanForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Form Belum Lengkap',
        text: 'Harap lengkapi semua kolom yang wajib diisi (*).',
        confirmButtonColor: '#155034'
      });
      return;
    }

    const validItems = (this.orderItems.value || []).filter(
      (m: any) => m.name && m.name.trim() !== '' && m.price !== null && m.price >= 0
    );

    if (validItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Menu Belum Ada',
        text: 'Harap masukkan minimal 1 menu pesanan/observasi.',
        confirmButtonColor: '#155034'
      });
      return;
    }

    this.submitting = true;

    // Step 1: Upload new photos if any
    if (this.uploadedPhotos.length > 0) {
      const filesToUpload = this.uploadedPhotos.map(p => p.file);
      this.potensiService.uploadImages(filesToUpload).subscribe({
        next: (uploadRes) => {
          const newUrls = uploadRes && uploadRes.urls ? uploadRes.urls : [];
          const allFinalPhotos = [...this.existingPhotos, ...newUrls];
          this.saveObservationData(allFinalPhotos, validItems);
        },
        error: (err) => {
          console.warn('Foto gagal diupload, melanjutkan simpan observasi:', err);
          this.saveObservationData(this.existingPhotos, validItems);
        }
      });
    } else {
      this.saveObservationData(this.existingPhotos, validItems);
    }
  }

  private saveObservationData(photoUrls: string[], validItems: any[]): void {
    const formVal = this.pendataanForm.value;
    const username = this.currentUser?.username || this.currentUser?.nama || 'Surveyor';

    const obsPayload: PotensiObservation = {
      potensiId: this.potensiId!,
      tanggalObservasi: formVal.tanggalObservasi,
      tipeWaktu: formVal.tipeWaktu,
      jumlahPengunjung: Number(formVal.jumlahPengunjung) || 1,
      durasiJam: Number(formVal.durasiJam) || 1.0,
      catatan: formVal.catatan || '',
      menuItems: validItems,
      photoUrls: photoUrls
    };

    this.potensiService.addObservation(this.potensiId!, obsPayload, username).subscribe({
      next: () => {
        // Step 2: Also update photoUrls on the Potensi if photos were changed
        if (this.selectedPotensi) {
          const updatedPotensiPayload: PbjtPotensi = {
            ...this.selectedPotensi,
            photoUrls: photoUrls
          };
          this.potensiService.updatePotensi(this.potensiId!, updatedPotensiPayload, username).subscribe({
            next: () => this.finishAndRedirect(),
            error: () => this.finishAndRedirect()
          });
        } else {
          this.finishAndRedirect();
        }
      },
      error: (err) => {
        this.submitting = false;
        console.error('Error saving observation:', err);
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menyimpan Pendataan',
          text: err.error?.message || err.message || 'Terjadi kesalahan sistem saat menyimpan data observasi.',
          confirmButtonColor: '#155034'
        });
      }
    });
  }

  private finishAndRedirect(): void {
    this.submitting = false;
    Swal.fire({
      icon: 'success',
      title: 'Observasi Berhasil Disimpan!',
      html: `Hasil Observasi & Pendataan untuk <b>"${this.selectedPotensi?.namaUsaha || 'Potensi PBJT'}"</b> berhasil disimpan.<br><small class="text-muted">Kalkulasi potensi pajak daerah telah diperbarui otomatis.</small>`,
      confirmButtonText: 'Kembali ke Daftar Potensi',
      confirmButtonColor: '#155034'
    }).then(() => {
      this.router.navigate(['/pbjt-makanan/potensi']);
    });
  }

  cancel(): void {
    this.router.navigate(['/pbjt-makanan/potensi']);
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

  formatCurrency(val: number): string {
    if (!val || isNaN(val)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  }
}
