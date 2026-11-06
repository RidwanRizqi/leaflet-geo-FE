import { Component, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';
import { SettingService, OpsenData, JenisPajakOption } from 'src/app/services/setting.service';

@Component({
  selector: 'app-opsen',
  templateUrl: './opsen.component.html',
  styleUrls: ['./opsen.component.scss']
})
export class OpsenComponent implements OnInit {
  breadCrumbItems!: Array<{}>;
  breadCrumbTitle = 'Opsen';

  // Table Data
  displayedData: OpsenData[] = [];
  totalRecords = 0;
  page = 1;
  pageSize = 10;
  startIndex = 0;
  endIndex = 0;

  // Filters
  filterTahun: number | null = null;
  filterBulan: number | null = null;
  filterJenis: string = '';

  // Options
  tahunOptions: number[] = [];
  bulanOptions = [
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' }, { value: 4, label: 'April' },
    { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' }, { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
  ];
  jenisOpsenOptions: JenisPajakOption[] = [];

  // Form
  @ViewChild('addEditModal') addEditModal: any;
  fg!: UntypedFormGroup;
  submitted = false;
  isEdit = false;
  currentId: number | null = null;

  constructor(
    private modalService: NgbModal,
    private formBuilder: UntypedFormBuilder,
    private settingService: SettingService
  ) { }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Pengaturan' },
      { label: 'Opsen', active: true }
    ];

    // Generate Tahun (5 tahun ke belakang dan 1 tahun ke depan)
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
      this.tahunOptions.push(i);
    }
    this.tahunOptions.sort((a, b) => b - a);

    this.initForm();
    this.loadJenisOpsen();
    this.loadData();
  }

  initForm() {
    this.fg = this.formBuilder.group({
      tahun: [null, [Validators.required]],
      bulan: [null, [Validators.required]],
      jenis_opsen: ['', [Validators.required]],
      nilai_realisasi: [null, [Validators.required, Validators.min(0)]],
      keterangan: ['']
    });
  }

  get formControls() {
    return this.fg.controls;
  }

  loadJenisOpsen() {
    this.settingService.getJenisOpsenOptions().subscribe({
      next: (res) => this.jenisOpsenOptions = res,
      error: (err) => console.error('Error loading jenis opsen', err)
    });
  }

  loadData() {
    const apiPage = this.page - 1;
    const filters = {
      tahun: this.filterTahun || undefined,
      bulan: this.filterBulan || undefined,
      jenis_opsen: this.filterJenis || undefined
    };

    this.settingService.getOpsenPaginated(apiPage, this.pageSize, filters).subscribe({
      next: (res) => {
        this.displayedData = res.items;
        this.totalRecords = res.totalCount;
        this.startIndex = res.page * res.size;
        this.endIndex = Math.min(this.startIndex + res.size, this.totalRecords);
      },
      error: (err) => {
        console.error('Error loading data', err);
        Swal.fire('Error', 'Gagal memuat data Opsen', 'error');
      }
    });
  }

  onFilterChange() {
    this.page = 1;
    this.loadData();
  }

  clearFilters() {
    this.filterTahun = null;
    this.filterBulan = null;
    this.filterJenis = '';
    this.onFilterChange();
  }

  onPageChange(page: number) {
    this.page = page;
    this.loadData();
  }

  openAddModal() {
    this.isEdit = false;
    this.currentId = null;
    this.submitted = false;
    this.fg.reset();
    
    // Set default values
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    this.fg.patchValue({ 
      tahun: currentYear, 
      bulan: currentMonth 
    });

    // Enable all controls
    this.fg.get('tahun')?.enable();
    this.fg.get('bulan')?.enable();
    this.fg.get('jenis_opsen')?.enable();

    this.modalService.open(this.addEditModal, { size: 'lg', centered: true });
  }

  openEditModal(item: OpsenData) {
    this.isEdit = true;
    this.currentId = item.id || null;
    this.submitted = false;
    
    this.fg.patchValue({
      tahun: item.tahun,
      bulan: item.bulan,
      jenis_opsen: item.jenis_opsen,
      nilai_realisasi: item.nilai_realisasi,
      keterangan: item.keterangan || ''
    });

    // Disable primary keys when editing
    this.fg.get('tahun')?.disable();
    this.fg.get('bulan')?.disable();
    this.fg.get('jenis_opsen')?.disable();

    this.modalService.open(this.addEditModal, { size: 'lg', centered: true });
  }

  closeModal() {
    this.modalService.dismissAll();
    this.fg.reset();
  }

  onSubmit() {
    this.submitted = true;
    if (this.fg.invalid) return;

    const rawData = this.fg.getRawValue();
    const data: OpsenData = {
      tahun: rawData.tahun,
      bulan: rawData.bulan,
      jenis_opsen: rawData.jenis_opsen,
      nilai_realisasi: rawData.nilai_realisasi,
      keterangan: rawData.keterangan
    };

    if (this.isEdit && this.currentId) {
      this.settingService.updateOpsen(this.currentId, data).subscribe({
        next: (res) => {
          Swal.fire('Berhasil', 'Data berhasil diubah!', 'success');
          this.closeModal();
          this.loadData();
        },
        error: (err) => this.handleError(err)
      });
    } else {
      this.settingService.createOpsen(data).subscribe({
        next: (res) => {
          Swal.fire('Berhasil', 'Data berhasil ditambahkan!', 'success');
          this.closeModal();
          this.loadData();
        },
        error: (err) => this.handleError(err)
      });
    }
  }

  deleteItem(item: OpsenData) {
    if (!item.id) return;
    
    const namaBulan = this.getNamaBulan(item.bulan);
    Swal.fire({
      title: 'Hapus Data?',
      text: `Apakah Anda yakin ingin menghapus realisasi ${item.jenis_opsen} bulan ${namaBulan} ${item.tahun}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f46a6a',
      cancelButtonColor: '#74788d',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        this.settingService.deleteOpsen(item.id!).subscribe({
          next: () => {
            Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
            this.loadData();
          },
          error: (err) => Swal.fire('Error', 'Gagal menghapus data', 'error')
        });
      }
    });
  }

  formatCurrency(value: number): string {
    if (value === null || value === undefined) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  getNamaBulan(bulan: number): string {
    const found = this.bulanOptions.find(b => b.value === bulan);
    return found ? found.label : '-';
  }

  private handleError(err: any) {
    let msg = 'Terjadi kesalahan pada sistem.';
    if (err.error && err.error.error) {
      msg = err.error.error;
    }
    Swal.fire('Gagal', msg, 'error');
  }
}
