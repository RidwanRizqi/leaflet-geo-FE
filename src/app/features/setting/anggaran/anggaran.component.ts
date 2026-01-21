import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ModalService } from 'src/app/shared/services/modal.service';
import { SettingService, AnggaranData, JenisPajakOption } from 'src/app/services/setting.service';

interface Anggaran {
    tahun_anggaran: number;
    jenis_pajak: string;
    nilai_anggaran: number;
    created_at?: string;
    updated_at?: string;
}

@Component({
    selector: 'app-anggaran',
    templateUrl: './anggaran.component.html',
    styleUrls: ['./anggaran.component.scss']
})
export class AnggaranComponent implements OnInit, OnDestroy {
    Math = Math;

    breadCrumbTitle!: string;
    breadCrumbItems!: Array<{}>;
    private langChangeSubscription!: Subscription;

    // Table data
    originalData: Anggaran[] = [];
    filteredData: Anggaran[] = [];
    displayedData: Anggaran[] = [];

    // Dropdown data
    jenisPajakOptions: JenisPajakOption[] = [];
    tahunOptions: number[] = [];

    // Pagination
    page: number = 1;
    pageSize: number = 10;
    totalRecords: number = 0;
    startIndex: number = 0;
    endIndex: number = 0;

    // Search & Column Filters
    filterTahun: number | null = null;
    filterJenis: string = '';
    private searchSubject = new Subject<string>();
    isSearching: boolean = false;

    // Form
    fg!: FormGroup;
    submitted = false;
    isEdit = false;
    editKey = { tahun: 0, jenis: '' };

    @ViewChild('addEditModal', { static: false })
    addEditModal?: TemplateRef<any>;

    constructor(
        private formBuilder: FormBuilder,
        private modalService: NgbModal,
        private translate: TranslateService,
        private spinner: NgxSpinnerService,
        private customModalService: ModalService,
        private settingService: SettingService
    ) { }

    ngOnInit(): void {
        this.initializeBreadcrumb();
        this.initializeForm();
        this.loadDropdownData();
        this.loadData();
        this.setupSearch();

        this.langChangeSubscription = this.translate.onLangChange.subscribe(() => {
            this.initializeBreadcrumb();
        });
    }

    ngOnDestroy(): void {
        if (this.langChangeSubscription) {
            this.langChangeSubscription.unsubscribe();
        }
        this.searchSubject.complete();
    }

    initializeBreadcrumb(): void {
        this.breadCrumbTitle = 'Anggaran Pajak';
        this.breadCrumbItems = [
            { label: this.translate.instant('MENUITEMS.SETTING.TEXT'), active: false },
            { label: 'Anggaran', active: true }
        ];
    }

    initializeForm(): void {
        this.fg = this.formBuilder.group({
            tahun_anggaran: [null, [Validators.required]],
            jenis_pajak: ['', [Validators.required]],
            nilai_anggaran: [null, [Validators.required, Validators.min(0)]]
        });
    }

    get formControls() {
        return this.fg.controls;
    }

    setupSearch(): void {
        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged()
        ).subscribe(() => {
            this.performSearch();
        });
    }

    loadDropdownData(): void {
        // Generate tahun options (current year - 5 to current year + 5)
        const currentYear = new Date().getFullYear();
        this.tahunOptions = [];
        for (let i = currentYear - 5; i <= currentYear + 5; i++) {
            this.tahunOptions.push(i);
        }

        // Load jenis pajak options
        this.settingService.getJenisPajakOptions().subscribe({
            next: (options) => {
                this.jenisPajakOptions = options;
            },
            error: (err) => {
                console.error('Error loading jenis pajak options:', err);
                // Fallback options
                this.jenisPajakOptions = [
                    { value: 'REKLAME', label: 'Pajak Reklame' },
                    { value: 'AIR_TANAH', label: 'Pajak Air Tanah' },
                    { value: 'MBLB', label: 'Pajak MBLB' },
                    { value: 'PBB_P2', label: 'PBB-P2' },
                    { value: 'BPHTB', label: 'BPHTB' },
                    { value: 'PBJT_MAKANAN_MINUMAN', label: 'PBJT Makanan dan/atau Minuman' },
                    { value: 'PBJT_LISTRIK', label: 'PBJT Tenaga Listrik' },
                    { value: 'PBJT_HOTEL', label: 'PBJT Jasa Perhotelan' },
                    { value: 'PBJT_PARKIR', label: 'PBJT Jasa Parkir' },
                    { value: 'PBJT_HIBURAN', label: 'PBJT Jasa Kesenian dan Hiburan' },
                    { value: 'OPSEN_PKB', label: 'Opsen PKB' },
                    { value: 'OPSEN_BBNKB', label: 'Opsen BBNKB' }
                ];
            }
        });
    }

    loadData(): void {
        this.spinner.show();
        const filters: any = {};
        if (this.filterTahun) filters.tahun_anggaran = this.filterTahun;
        if (this.filterJenis) filters.jenis_pajak = this.filterJenis;

        this.settingService.getAnggaranPaginated(this.page - 1, this.pageSize, filters).subscribe({
            next: (response) => {
                this.originalData = response.items as Anggaran[];
                this.filteredData = [...this.originalData];
                this.displayedData = [...this.originalData];
                this.totalRecords = response.totalCount;
                this.updatePagination();
                this.spinner.hide();
            },
            error: (error) => {
                console.error('Error loading anggaran:', error);
                this.customModalService.open('error', 'Gagal memuat data anggaran');
                this.spinner.hide();
            }
        });
    }

    updatePagination(): void {
        this.startIndex = (this.page - 1) * this.pageSize;
        this.endIndex = Math.min(this.startIndex + this.pageSize, this.totalRecords);
    }

    onPageChange(newPage: number): void {
        this.page = newPage;
        this.loadData();
    }

    onFilterChange(): void {
        this.performSearch();
    }

    performSearch(): void {
        this.isSearching = true;
        this.page = 1;
        this.loadData();
        this.isSearching = false;
    }

    clearFilters(): void {
        this.filterTahun = null;
        this.filterJenis = '';
        this.page = 1;
        this.loadData();
    }

    getJenisPajakLabel(value: string): string {
        const option = this.jenisPajakOptions.find(o => o.value === value);
        return option ? option.label : value;
    }

    formatCurrency(value: number): string {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    // Modal operations
    openAddModal(): void {
        this.isEdit = false;
        this.editKey = { tahun: 0, jenis: '' };
        this.fg.reset();
        this.submitted = false;
        this.modalService.open(this.addEditModal!, {
            centered: true,
            size: 'lg',
            backdrop: 'static'
        });
    }

    openEditModal(item: Anggaran): void {
        this.isEdit = true;
        this.editKey = { tahun: item.tahun_anggaran, jenis: item.jenis_pajak };
        this.fg.patchValue({
            tahun_anggaran: item.tahun_anggaran,
            jenis_pajak: item.jenis_pajak,
            nilai_anggaran: item.nilai_anggaran
        });
        // Disable tahun and jenis in edit mode (they are primary key)
        this.fg.get('tahun_anggaran')?.disable();
        this.fg.get('jenis_pajak')?.disable();

        this.submitted = false;
        this.modalService.open(this.addEditModal!, {
            centered: true,
            size: 'lg',
            backdrop: 'static'
        });
    }

    async onSubmit(): Promise<void> {
        this.submitted = true;
        if (this.fg.invalid) return;

        this.spinner.show();
        const formData = this.fg.getRawValue(); // getRawValue to include disabled fields

        const data: AnggaranData = {
            tahun_anggaran: formData.tahun_anggaran,
            jenis_pajak: formData.jenis_pajak,
            nilai_anggaran: formData.nilai_anggaran
        };

        if (this.isEdit) {
            this.settingService.updateAnggaran(this.editKey.tahun, this.editKey.jenis, data).subscribe({
                next: () => {
                    this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.UPDATE'));
                    this.modalService.dismissAll();
                    this.loadData();
                    this.spinner.hide();
                },
                error: (error) => {
                    console.error('Error updating anggaran:', error);
                    this.customModalService.open('error', error?.error?.error || 'Gagal mengupdate anggaran');
                    this.spinner.hide();
                }
            });
        } else {
            this.settingService.createAnggaran(data).subscribe({
                next: () => {
                    this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.ADD'));
                    this.modalService.dismissAll();
                    this.loadData();
                    this.spinner.hide();
                },
                error: (error) => {
                    console.error('Error creating anggaran:', error);
                    this.customModalService.open('error', error?.error?.error || 'Gagal menambah anggaran');
                    this.spinner.hide();
                }
            });
        }
    }

    async deleteItem(item: Anggaran): Promise<void> {
        try {
            const result = await this.customModalService.open('confirm',
                this.translate.instant('COMMON.CUSTOMMODAL.DELETETEXT'),
                { name: `Anggaran ${item.jenis_pajak} ${item.tahun_anggaran}` }
            );

            if (result === true) {
                this.spinner.show();
                this.settingService.deleteAnggaran(item.tahun_anggaran, item.jenis_pajak).subscribe({
                    next: () => {
                        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.DELETE'));
                        this.loadData();
                        this.spinner.hide();
                    },
                    error: (error) => {
                        console.error('Error deleting anggaran:', error);
                        this.customModalService.open('error', 'Gagal menghapus anggaran');
                        this.spinner.hide();
                    }
                });
            }
        } catch (error) {
            console.log('Delete cancelled');
        }
    }

    closeModal(): void {
        // Re-enable disabled fields
        this.fg.get('tahun_anggaran')?.enable();
        this.fg.get('jenis_pajak')?.enable();
        this.modalService.dismissAll();
    }

    trackByFn(index: number, item: Anggaran): string {
        return `${item.tahun_anggaran}_${item.jenis_pajak}`;
    }
}
