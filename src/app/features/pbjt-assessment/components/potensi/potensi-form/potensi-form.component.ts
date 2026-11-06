import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PbjtPotensiService } from '../../../services/pbjt-potensi.service';
import { RestApiService } from 'src/app/core/services/rest-api.service';
import { Store } from '@ngrx/store';
import { selectCurrentUser } from 'src/app/store/auth/auth.selector';
import { MasterMenu, MenuItem, PbjtPotensi } from '../../../models/potensi.model';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-potensi-form',
  templateUrl: './potensi-form.component.html',
  styleUrls: ['./potensi-form.component.scss']
})
export class PotensiFormComponent implements OnInit {
  // Breadcrumbs
  breadCrumbTitle: string = 'Form Potensi PBJT';
  breadCrumbItems = [
    { label: 'PBJT Assessment' },
    { label: 'Potensi PBJT' },
    { label: 'Form Input', active: true }
  ];

  isEditMode: boolean = false;
  potensiId: number = 0;
  activeTab: number = 1;
  loading: boolean = false;
  submitting: boolean = false;
  submitted: boolean = false;
  errorMessage: string = '';

  // Forms
  potensiForm!: FormGroup;

  // Master Menus for autocomplete
  masterMenus: MasterMenu[] = [];

  // Existing Business Names for autocomplete
  businessNames: string[] = [];
  isLoadingMenusByName: boolean = false;

  // Dropdown options
  businessTypes = [
    { value: 'WARUNG_KECIL', label: 'Warung Kecil (Koef: 0.85)' },
    { value: 'RUMAH_MAKAN', label: 'Rumah Makan (Koef: 1.00)' },
    { value: 'RESTAURANT', label: 'Restaurant (Koef: 1.10)' },
    { value: 'CAFE_MODERN', label: 'Café Modern (Koef: 1.20)' },
    { value: 'FRANCHISE', label: 'Franchise / Waralaba (Koef: 1.15)' }
  ];

  roadTypes = [
    { value: 'ARTERI', label: 'Jalan Nasional' },
    { value: 'KOLEKTOR', label: 'Jalan Kabupaten' },
    { value: 'LOKAL', label: 'Jalan Desa' },
    { value: 'GANG', label: 'Gang / Perkampungan)' }
  ];

  crowdLevels = [
    { value: 'SEPI', label: 'Sepi (Faktor: 0.5x)' },
    { value: 'NORMAL', label: 'Normal (Faktor: 1.0x)' },
    { value: 'RAMAI', label: 'Ramai (Faktor: 1.5x)' }
  ];

  // Kecamatan & Kelurahan
  kecamatanList: { value: string; label: string; kdKec: string }[] = [];
  kelurahanList: { value: string; label: string; kdKel: string }[] = [];
  isLoadingKecamatan: boolean = false;
  isLoadingKelurahan: boolean = false;

  // Live Calculation preview
  calcPreview = {
    avgFood: 0,
    avgBev: 0,
    spendPerPerson: 0,
    dailyVisitors: 0,
    monthlyRevenue: 0,
    monthlyPbjt: 0,
    annualPbjt: 0
  };

  currentUser: any = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private potensiService: PbjtPotensiService,
    private restApiService: RestApiService,
    private store: Store
  ) {}

  ngOnInit(): void {
    this.store.select(selectCurrentUser).subscribe(user => {
      this.currentUser = user;
    });

    this.initForm();
    this.loadMasterMenus();
    this.loadBusinessNames();
    this.loadKecamatanList();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.potensiId = +params['id'];
        this.loadPotensiData(this.potensiId);
      } else {
        this.generateNewCode();
      }
    });

    // Listen to form value changes for live calculation
    this.potensiForm.valueChanges.subscribe(() => {
      this.calculateLiveEstimates();
    });
  }

  generateInstantCode(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const rnd = Math.floor(1000 + Math.random() * 9000);
    return `POT-${yyyy}${mm}-${rnd}`;
  }

  initForm(): void {
    const today = new Date().toISOString().split('T')[0];

    this.potensiForm = this.fb.group({
      // Step 1: Profil (Kode potensi terisi otomatis sejak detik pertama)
      kodePotensi: [this.generateInstantCode(), Validators.required],
      namaUsaha: ['', Validators.required],
      tipeUsaha: ['WARUNG_KECIL', Validators.required],
      tanggalPendataan: [today, Validators.required],
      kapasitasKursi: [25, [Validators.required, Validators.min(1)]],
      luasBangunan: [50, [Validators.min(0)]],
      jamBuka: ['08:00', Validators.required],
      jamTutup: ['21:00', Validators.required],

      // Step 2: Lokasi & GIS
      alamat: ['', Validators.required],
      kecamatan: ['', Validators.required],
      kelurahan: ['', Validators.required],
      kabupaten: ['Lumajang'],
      kdKec: [''],
      kdKel: [''],
      latitude: [-8.1333, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [113.2223, [Validators.required, Validators.min(-180), Validators.max(180)]],
      roadType: ['LOKAL'],
      nearSchool: [false],
      nearOffice: [false],
      nearMarket: [false],
      crowdLevel: ['NORMAL'],
      surveyorId: [''],

      // Step 3: Menu
      openingDaysPerMonth: [30, [Validators.required, Validators.min(1), Validators.max(31)]],
      menuItems: this.fb.array([])
    });

    // Initial menu item row
    this.addMenuItem();
  }

  get menuItems(): FormArray {
    return this.potensiForm.get('menuItems') as FormArray;
  }

  addMenuItem(name: string = '', price: number | null = null, category: string = 'FOOD'): void {
    const itemGroup = this.fb.group({
      name: [name, Validators.required],
      price: [price, [Validators.required, Validators.min(0)]],
      category: [category, Validators.required]
    });
    this.menuItems.push(itemGroup);
    this.calculateLiveEstimates();
  }

  removeMenuItem(index: number): void {
    if (this.menuItems.length > 1) {
      this.menuItems.removeAt(index);
    } else {
      this.menuItems.at(0).reset({ name: '', price: null, category: 'FOOD' });
    }
    this.calculateLiveEstimates();
  }

  onMenuNameSelected(index: number, event: any): void {
    const selectedName = event.target.value;
    const matched = this.masterMenus.find(m => m.namaMenu.toLowerCase() === selectedName.toLowerCase().trim());
    if (matched) {
      const itemRow = this.menuItems.at(index);
      itemRow.patchValue({
        category: matched.kategori || 'FOOD',
        price: matched.defaultHarga || null
      });
      this.calculateLiveEstimates();
    }
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

  loadBusinessNames(): void {
    this.potensiService.getBusinessNames().subscribe({
      next: (res) => {
        if (res && res.success) {
          this.businessNames = res.data || [];
        }
      },
      error: (err) => console.error('Error fetching business names:', err)
    });
  }

  onNamaUsahaBlurOrSelect(): void {
    const rawVal = this.potensiForm.get('namaUsaha')?.value;
    if (!rawVal || rawVal.trim().length < 2) return;
    const cleanName = rawVal.trim();

    this.isLoadingMenusByName = true;
    this.potensiService.getMenusByName(cleanName).subscribe({
      next: (res) => {
        this.isLoadingMenusByName = false;
        if (res && res.success && res.found && res.menuItems && res.menuItems.length > 0) {
          const loadedItems = res.menuItems;
          const currentMenus = (this.menuItems.value || []).filter((m: any) => m.name && m.price !== null);
          const applyLoadedMenus = () => {
            while (this.menuItems.length > 0) {
              this.menuItems.removeAt(0);
            }
            loadedItems.forEach((m: any) => {
              this.addMenuItem(m.name, m.price, m.category || 'FOOD');
            });
            this.calculateLiveEstimates();
            Swal.fire({
              icon: 'success',
              title: 'Menu Berhasil Dimuat',
              text: `Berhasil memuat ${loadedItems.length} menu dari data "${res.businessName}".`,
              confirmButtonColor: '#155034'
            });
          };

          if (currentMenus.length === 0) {
            applyLoadedMenus();
          } else {
            Swal.fire({
              title: 'Muat Menu Otomatis?',
              text: `Ditemukan data menu untuk "${res.businessName}" (${loadedItems.length} menu). Apakah Anda ingin memuat menu tersebut otomatis ke form?`,
              icon: 'question',
              showCancelButton: true,
              confirmButtonColor: '#155034',
              cancelButtonColor: '#6c757d',
              confirmButtonText: 'Ya, Muat Menu',
              cancelButtonText: 'Batal'
            }).then((result) => {
              if (result.isConfirmed) {
                applyLoadedMenus();
              }
            });
          }
        }
      },
      error: (err) => {
        this.isLoadingMenusByName = false;
        console.error('Error fetching menus by name:', err);
      }
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.potensiForm.get(fieldName);
    return !!(control && control.invalid && (control.touched || this.submitted));
  }

  isMenuItemInvalid(index: number, field: string): boolean {
    const row = this.menuItems.at(index);
    const control = row?.get(field);
    return !!(control && control.invalid && (control.touched || this.submitted));
  }

  generateNewCode(): void {
    const tgl = this.potensiForm.get('tanggalPendataan')?.value;
    this.potensiService.getGeneratedKode(tgl).subscribe({
      next: (res) => {
        if (res && res.success && res.kodePotensi) {
          this.potensiForm.patchValue({ kodePotensi: res.kodePotensi });
        }
      },
      error: (err) => {
        console.error('Error generating kode potensi:', err);
        if (!this.potensiForm.get('kodePotensi')?.value) {
          this.potensiForm.patchValue({ kodePotensi: this.generateInstantCode() });
        }
      }
    });
  }

  loadKecamatanList(): void {
    this.isLoadingKecamatan = true;
    this.restApiService.getKecamatanWithCount('35', '08').subscribe({
      next: (res: any) => {
        const arr = res?.data || res;
        if (Array.isArray(arr)) {
          this.kecamatanList = arr.map((k: any) => ({
            value: k.nmKecamatan,
            label: k.nmKecamatan,
            kdKec: k.kdKecamatan
          }));
        }
        this.isLoadingKecamatan = false;
      },
      error: () => this.isLoadingKecamatan = false
    });
  }

  onKecamatanChange(): void {
    const selectedKecName = this.potensiForm.get('kecamatan')?.value;
    const found = this.kecamatanList.find(k => k.value === selectedKecName);
    if (found && found.kdKec) {
      this.potensiForm.patchValue({ kdKec: found.kdKec, kelurahan: '', kdKel: '' });
      this.loadKelurahanList(found.kdKec);
    } else {
      this.kelurahanList = [];
    }
  }

  loadKelurahanList(kdKec: string, callback?: () => void): void {
    this.isLoadingKelurahan = true;
    this.restApiService.getKelurahanWithCount('35', '08', kdKec).subscribe({
      next: (res: any) => {
        const arr = res?.data || res;
        if (Array.isArray(arr)) {
          this.kelurahanList = arr.map((k: any) => ({
            value: k.nmKelurahan,
            label: k.nmKelurahan,
            kdKel: k.kdKelurahan
          }));
        }
        this.isLoadingKelurahan = false;
        if (callback) callback();
      },
      error: () => this.isLoadingKelurahan = false
    });
  }

  onKelurahanChange(): void {
    const selectedKelName = this.potensiForm.get('kelurahan')?.value;
    const found = this.kelurahanList.find(k => k.value === selectedKelName);
    if (found && found.kdKel) {
      this.potensiForm.patchValue({ kdKel: found.kdKel });
    }
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.potensiForm.patchValue({
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6))
          });
          Swal.fire({
            icon: 'success',
            title: 'Lokasi GPS Ditemukan',
            text: `Koordinat: ${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
            timer: 2000,
            showConfirmButton: false
          });
        },
        (error) => {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Mendeteksi Lokasi',
            text: 'Gagal mendeteksi lokasi GPS: ' + error.message,
            confirmButtonColor: '#155034'
          });
        }
      );
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Geolokasi Tidak Didukung',
        text: 'Browser Anda tidak mendukung geolokasi GPS.',
        confirmButtonColor: '#155034'
      });
    }
  }

  loadPotensiData(id: number): void {
    this.loading = true;
    this.potensiService.getPotensiById(id).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          const d = res.data;
          this.potensiForm.patchValue({
            kodePotensi: d.kodePotensi,
            namaUsaha: d.namaUsaha,
            tipeUsaha: d.tipeUsaha || 'WARUNG_KECIL',
            tanggalPendataan: d.tanggalPendataan,
            kapasitasKursi: d.kapasitasKursi,
            luasBangunan: d.luasBangunan,
            jamBuka: d.jamBuka || '08:00',
            jamTutup: d.jamTutup || '21:00',
            alamat: d.alamat,
            kecamatan: d.kecamatan,
            kelurahan: d.kelurahan,
            kabupaten: d.kabupaten || 'Lumajang',
            kdKec: d.kdKec,
            kdKel: d.kdKel,
            latitude: d.latitude,
            longitude: d.longitude,
            roadType: d.roadType || 'LOKAL',
            nearSchool: d.nearSchool || false,
            nearOffice: d.nearOffice || false,
            nearMarket: d.nearMarket || false,
            crowdLevel: d.crowdLevel || 'NORMAL',
            surveyorId: d.surveyorId || '',
            openingDaysPerMonth: d.openingDaysPerMonth || 30
          });

          if (d.kdKec) {
            this.loadKelurahanList(d.kdKec, () => {
              this.potensiForm.patchValue({ kelurahan: d.kelurahan });
            });
          }

          if (d.menuItems && d.menuItems.length > 0) {
            this.menuItems.clear();
            d.menuItems.forEach(item => {
              this.addMenuItem(item.name, item.price, item.category);
            });
          }

          this.calculateLiveEstimates();
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading potensi data:', err);
        this.errorMessage = 'Gagal memuat data potensi.';
        this.loading = false;
      }
    });
  }

  calculateLiveEstimates(): void {
    const rawItems: any[] = this.menuItems?.value || [];
    const foodPrices: number[] = [];
    const bevPrices: number[] = [];

    for (const item of rawItems) {
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

    const capacity = Number(this.potensiForm.get('kapasitasKursi')?.value) || 25;
    const turnoverRate = 2.0;

    // Operating hours factor
    const openTime = this.potensiForm.get('jamBuka')?.value || '08:00';
    const closeTime = this.potensiForm.get('jamTutup')?.value || '21:00';
    const [h1, m1] = openTime.split(':').map(Number);
    const [h2, m2] = closeTime.split(':').map(Number);
    const totalHours = Math.max(1, ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
    const hoursFactor = Math.max(0.5, totalHours / 8.0);

    // Location score
    let locScore = 1.0;
    if (this.potensiForm.get('nearSchool')?.value) locScore += 0.10;
    if (this.potensiForm.get('nearOffice')?.value) locScore += 0.15;
    if (this.potensiForm.get('nearMarket')?.value) locScore += 0.12;
    const road = this.potensiForm.get('roadType')?.value || '';
    if (road === 'ARTERI') locScore += 0.20;
    else if (road === 'KOLEKTOR') locScore += 0.15;
    else if (road === 'LOKAL') locScore += 0.05;
    if (locScore > 1.50) locScore = 1.50;

    // Type coeff
    let typeCoeff = 1.0;
    const tipe = this.potensiForm.get('tipeUsaha')?.value;
    if (tipe === 'WARUNG_KECIL') typeCoeff = 0.85;
    else if (tipe === 'RUMAH_MAKAN') typeCoeff = 1.00;
    else if (tipe === 'RESTAURANT') typeCoeff = 1.10;
    else if (tipe === 'CAFE_MODERN') typeCoeff = 1.20;
    else if (tipe === 'FRANCHISE') typeCoeff = 1.15;

    // Crowd multiplier
    let crowdMult = 1.0;
    const crowd = this.potensiForm.get('crowdLevel')?.value;
    if (crowd === 'SEPI') crowdMult = 0.5;
    else if (crowd === 'RAMAI') crowdMult = 1.5;

    const dailyVisitors = Math.round(capacity * turnoverRate * hoursFactor * locScore * typeCoeff * crowdMult);
    const openingDays = Number(this.potensiForm.get('openingDaysPerMonth')?.value) || 30;

    const monthlyRevenue = Math.round(spendPerPerson * dailyVisitors * openingDays);
    const monthlyPbjt = Math.round(monthlyRevenue * 0.10);
    const annualPbjt = Math.round(monthlyPbjt * 12 * 1.03);

    this.calcPreview = {
      avgFood,
      avgBev,
      spendPerPerson,
      dailyVisitors,
      monthlyRevenue,
      monthlyPbjt,
      annualPbjt
    };
  }

  onSubmit(): void {
    this.submitted = true;

    // Pastikan kode potensi terisi otomatis agar selalu valid
    const currentKode = this.potensiForm.get('kodePotensi')?.value;
    if (!currentKode || currentKode.trim() === '') {
      this.potensiForm.patchValue({ kodePotensi: this.generateInstantCode() });
    }

    if (this.potensiForm.invalid) {
      this.potensiForm.markAllAsTouched();

      // Urutan pengecekan field wajib bertanda bintang (*)
      const fieldConfig: { key: string; tab: number; id: string; label: string }[] = [
        { key: 'tanggalPendataan', tab: 1, id: 'input-tanggalPendataan', label: 'Tanggal Pendataan' },
        { key: 'tipeUsaha', tab: 1, id: 'input-tipeUsaha', label: 'Tipe Usaha' },
        { key: 'namaUsaha', tab: 1, id: 'input-namaUsaha', label: 'Nama Usaha' },
        { key: 'kapasitasKursi', tab: 1, id: 'input-kapasitasKursi', label: 'Kapasitas Kursi' },
        { key: 'jamBuka', tab: 1, id: 'input-jamBuka', label: 'Jam Buka' },
        { key: 'jamTutup', tab: 1, id: 'input-jamTutup', label: 'Jam Tutup' },
        { key: 'alamat', tab: 2, id: 'input-alamat', label: 'Alamat Lengkap' },
        { key: 'kecamatan', tab: 2, id: 'input-kecamatan', label: 'Kecamatan' },
        { key: 'kelurahan', tab: 2, id: 'input-kelurahan', label: 'Kelurahan' },
        { key: 'latitude', tab: 2, id: 'input-latitude', label: 'Latitude' },
        { key: 'longitude', tab: 2, id: 'input-longitude', label: 'Longitude' },
        { key: 'openingDaysPerMonth', tab: 3, id: 'input-openingDaysPerMonth', label: 'Hari Buka Per Bulan' }
      ];

      const firstInvalid = fieldConfig.find(item => {
        const control = this.potensiForm.get(item.key);
        return control && control.invalid;
      });

      if (firstInvalid) {
        // 1. Pindahkan tab secara otomatis ke lokasi input yang belum diisi
        this.activeTab = firstInvalid.tab;

        // 2. Beri notifikasi ke user via SweetAlert
        Swal.fire({
          icon: 'warning',
          title: 'Kolom Belum Lengkap',
          html: `Harap lengkapi semua kolom bertanda <b>(*)</b>.<br><br>Kolom <b>"${firstInvalid.label}"</b> belum diisi.`,
          confirmButtonColor: '#155034'
        });

        // 3. Arahkan fokus dan scroll langsung ke inputan yang ditandai merah
        setTimeout(() => {
          const el = document.getElementById(firstInvalid.id) || (document.querySelector('.is-invalid') as HTMLElement);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.focus();
          }
        }, 150);
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Form Belum Lengkap',
          text: 'Harap lengkapi semua kolom wajib dengan tanda (*).',
          confirmButtonColor: '#155034'
        });
      }
      return;
    }

    const validMenuItems = (this.menuItems.value || []).filter((m: any) => m.name && m.name.trim() !== '' && m.price !== null && m.price >= 0);
    if (validMenuItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Menu Masih Kosong',
        text: 'Minimal masukkan 1 menu makanan atau minuman pada tab Daftar Menu.',
        confirmButtonColor: '#155034'
      });
      this.activeTab = 3;
      setTimeout(() => {
        const firstMenuInput = document.getElementById('input-menu-name-0') || (document.querySelector('input[list="masterMenuList"]') as HTMLElement);
        if (firstMenuInput) {
          firstMenuInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstMenuInput.focus();
        }
      }, 150);
      return;
    }

    const formValue = this.potensiForm.value;
    const payload: PbjtPotensi = {
      ...formValue,
      menuItems: validMenuItems
    };

    this.submitting = true;
    const username = this.currentUser?.username || this.currentUser?.nama || 'Petugas';

    if (this.isEditMode) {
      this.potensiService.updatePotensi(this.potensiId, payload, username).subscribe({
        next: () => {
          this.submitting = false;
          Swal.fire({
            icon: 'success',
            title: 'Berhasil Diperbarui!',
            text: 'Data Potensi PBJT telah berhasil diperbarui.',
            confirmButtonColor: '#155034'
          }).then(() => {
            this.router.navigate(['/pbjt-makanan/potensi']);
          });
        },
        error: (err) => {
          this.submitting = false;
          console.error('Error updating potensi:', err);
          Swal.fire({
            icon: 'error',
            title: 'Gagal Memperbarui Data',
            text: err.error?.message || err.message,
            confirmButtonColor: '#155034'
          });
        }
      });
    } else {
      this.potensiService.createPotensi(payload, username).subscribe({
        next: () => {
          this.submitting = false;
          Swal.fire({
            icon: 'success',
            title: 'Berhasil Disimpan!',
            text: 'Data Potensi PBJT telah berhasil disimpan.',
            confirmButtonColor: '#155034'
          }).then(() => {
            this.router.navigate(['/pbjt-makanan/potensi']);
          });
        },
        error: (err) => {
          this.submitting = false;
          console.error('Error creating potensi:', err);
          Swal.fire({
            icon: 'error',
            title: 'Gagal Menyimpan Data',
            text: err.error?.message || err.message,
            confirmButtonColor: '#155034'
          });
        }
      });
    }
  }

  cancel(): void {
    this.router.navigate(['/pbjt-makanan/potensi']);
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
