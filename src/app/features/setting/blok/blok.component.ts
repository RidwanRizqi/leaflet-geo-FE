import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ModalService } from 'src/app/shared/services/modal.service';
import * as L from 'leaflet';

// Interfaces
interface Kecamatan {
    id: number;
    kd_kec: string;
    nama: string;
}

interface Kelurahan {
    id: number;
    kd_kec: string;
    kd_kel: string;
    nama: string;
}

interface Blok {
    id: number;
    kd_kec: string;
    kd_kel: string;
    kd_blok: string;
    geom: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    kecamatan?: Kecamatan;
    kelurahan?: Kelurahan;
}

@Component({
    selector: 'app-blok',
    templateUrl: './blok.component.html',
    styleUrls: ['./blok.component.scss']
})
export class BlokComponent implements OnInit, OnDestroy {
    // Expose Math for template
    Math = Math;

    breadCrumbTitle!: string;
    breadCrumbItems!: Array<{}>;
    private langChangeSubscription!: Subscription;

    // Table data
    originalData: Blok[] = [];
    filteredData: Blok[] = [];
    displayedData: Blok[] = [];

    // Dropdown data
    kecamatanList: Kecamatan[] = [];
    kelurahanList: Kelurahan[] = [];
    allKelurahanList: Kelurahan[] = [];

    // Form dropdown data (cascading)
    formKelurahanList: Kelurahan[] = [];

    // Pagination
    page: number = 1;
    pageSize: number = 10;
    totalRecords: number = 0;
    startIndex: number = 0;
    endIndex: number = 0;

    // Search & Column Filters
    filterKdKec: string = '';
    filterKdKel: string = '';
    filterKdBlok: string = '';
    private searchSubject = new Subject<string>();
    isSearching: boolean = false;

    // Form
    fg!: FormGroup;
    submitted = false;
    isEdit = false;
    editId: number = 0;
    currentLabel: string = '';  // For map label overlay

    // Map
    private map: L.Map | null = null;
    private geoJsonLayer: L.GeoJSON | null = null;

    @ViewChild('addEditModal', { static: false })
    addEditModal?: TemplateRef<any>;

    // Dummy Data
    private dummyKecamatan: Kecamatan[] = [
        { id: 1, kd_kec: '010', nama: 'Tempursari' },
        { id: 2, kd_kec: '020', nama: 'Pronojiwo' },
        { id: 3, kd_kec: '030', nama: 'Candipuro' },
        { id: 4, kd_kec: '040', nama: 'Pasirian' },
        { id: 5, kd_kec: '050', nama: 'Tempeh' },
        { id: 6, kd_kec: '060', nama: 'Lumajang' }
    ];

    private dummyKelurahan: Kelurahan[] = [
        { id: 1, kd_kec: '010', kd_kel: '001', nama: 'Tempursari' },
        { id: 2, kd_kec: '010', kd_kel: '002', nama: 'Bulurejo' },
        { id: 3, kd_kec: '020', kd_kel: '001', nama: 'Pronojiwo' },
        { id: 4, kd_kec: '020', kd_kel: '002', nama: 'Sumberurip' },
        { id: 5, kd_kec: '030', kd_kel: '001', nama: 'Candipuro' },
        { id: 6, kd_kec: '040', kd_kel: '001', nama: 'Pasirian' },
        { id: 7, kd_kec: '050', kd_kel: '001', nama: 'Tempeh Kidul' },
        { id: 8, kd_kec: '050', kd_kel: '002', nama: 'Tempeh Lor' },
        { id: 9, kd_kec: '060', kd_kel: '001', nama: 'Tompokersan' },
        { id: 10, kd_kec: '060', kd_kel: '002', nama: 'Jogotrunan' },
        { id: 11, kd_kec: '060', kd_kel: '003', nama: 'Citrodiwangsan' },
        { id: 12, kd_kec: '060', kd_kel: '004', nama: 'Ditotrunan' }
    ];

    private dummyBlok: Blok[] = [
        { id: 1, kd_kec: '010', kd_kel: '001', kd_blok: '001', geom: '{"type":"Polygon","coordinates":[[[113.1,-8.0],[113.12,-8.0],[113.12,-8.02],[113.1,-8.02],[113.1,-8.0]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15', kecamatan: { id: 1, kd_kec: '010', nama: 'Tempursari' }, kelurahan: { id: 1, kd_kec: '010', kd_kel: '001', nama: 'Tempursari' } },
        { id: 2, kd_kec: '010', kd_kel: '001', kd_blok: '002', geom: null, is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15', kecamatan: { id: 1, kd_kec: '010', nama: 'Tempursari' }, kelurahan: { id: 1, kd_kec: '010', kd_kel: '001', nama: 'Tempursari' } },
        { id: 3, kd_kec: '010', kd_kel: '002', kd_blok: '001', geom: '{"type":"Polygon","coordinates":[[[113.12,-8.0],[113.14,-8.0],[113.14,-8.02],[113.12,-8.02],[113.12,-8.0]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15', kecamatan: { id: 1, kd_kec: '010', nama: 'Tempursari' }, kelurahan: { id: 2, kd_kec: '010', kd_kel: '002', nama: 'Bulurejo' } },
        { id: 4, kd_kec: '020', kd_kel: '001', kd_blok: '001', geom: '{"type":"Polygon","coordinates":[[[113.2,-8.0],[113.22,-8.0],[113.22,-8.02],[113.2,-8.02],[113.2,-8.0]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15', kecamatan: { id: 2, kd_kec: '020', nama: 'Pronojiwo' }, kelurahan: { id: 3, kd_kec: '020', kd_kel: '001', nama: 'Pronojiwo' } },
        { id: 5, kd_kec: '020', kd_kel: '001', kd_blok: '002', geom: null, is_active: false, created_at: '2024-01-15', updated_at: '2024-01-15', kecamatan: { id: 2, kd_kec: '020', nama: 'Pronojiwo' }, kelurahan: { id: 3, kd_kec: '020', kd_kel: '001', nama: 'Pronojiwo' } },
        { id: 6, kd_kec: '060', kd_kel: '001', kd_blok: '001', geom: '{"type":"Polygon","coordinates":[[[113.15,-8.05],[113.17,-8.05],[113.17,-8.07],[113.15,-8.07],[113.15,-8.05]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15', kecamatan: { id: 6, kd_kec: '060', nama: 'Lumajang' }, kelurahan: { id: 9, kd_kec: '060', kd_kel: '001', nama: 'Tompokersan' } },
        { id: 7, kd_kec: '060', kd_kel: '001', kd_blok: '002', geom: '{"type":"Polygon","coordinates":[[[113.17,-8.05],[113.19,-8.05],[113.19,-8.07],[113.17,-8.07],[113.17,-8.05]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15', kecamatan: { id: 6, kd_kec: '060', nama: 'Lumajang' }, kelurahan: { id: 9, kd_kec: '060', kd_kel: '001', nama: 'Tompokersan' } },
        { id: 8, kd_kec: '060', kd_kel: '002', kd_blok: '001', geom: null, is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15', kecamatan: { id: 6, kd_kec: '060', nama: 'Lumajang' }, kelurahan: { id: 10, kd_kec: '060', kd_kel: '002', nama: 'Jogotrunan' } },
        { id: 9, kd_kec: '060', kd_kel: '003', kd_blok: '001', geom: '{"type":"Polygon","coordinates":[[[113.18,-8.08],[113.2,-8.08],[113.2,-8.1],[113.18,-8.1],[113.18,-8.08]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15', kecamatan: { id: 6, kd_kec: '060', nama: 'Lumajang' }, kelurahan: { id: 11, kd_kec: '060', kd_kel: '003', nama: 'Citrodiwangsan' } },
        { id: 10, kd_kec: '060', kd_kel: '004', kd_blok: '001', geom: '{"type":"Polygon","coordinates":[[[113.2,-8.08],[113.22,-8.08],[113.22,-8.1],[113.2,-8.1],[113.2,-8.08]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15', kecamatan: { id: 6, kd_kec: '060', nama: 'Lumajang' }, kelurahan: { id: 12, kd_kec: '060', kd_kel: '004', nama: 'Ditotrunan' } }
    ];

    constructor(
        private formBuilder: FormBuilder,
        private modalService: NgbModal,
        private translate: TranslateService,
        private spinner: NgxSpinnerService,
        private customModalService: ModalService
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
        this.destroyMap();
    }

    initializeBreadcrumb(): void {
        this.breadCrumbTitle = this.translate.instant('APPPAGE.SETTING.BLOK.TITLE');
        this.breadCrumbItems = [
            { label: this.translate.instant('MENUITEMS.SETTING.TEXT'), active: false },
            { label: this.translate.instant('APPPAGE.SETTING.BLOK.TITLE'), active: true }
        ];
    }

    initializeForm(): void {
        this.fg = this.formBuilder.group({
            kd_kec: ['', [Validators.required]],
            kd_kel: ['', [Validators.required]],
            kd_blok: ['', [Validators.required, Validators.maxLength(10)]],
            geojsonFile: [null]
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
        this.kecamatanList = [...this.dummyKecamatan];
        this.allKelurahanList = [...this.dummyKelurahan];
        this.kelurahanList = [];
    }

    loadData(): void {
        this.spinner.show();
        setTimeout(() => {
            this.originalData = [...this.dummyBlok];
            this.filteredData = [...this.originalData];
            this.totalRecords = this.filteredData.length;
            this.updatePagination();
            this.updateDisplayedData();
            this.spinner.hide();
        }, 500);
    }

    updatePagination(): void {
        this.startIndex = (this.page - 1) * this.pageSize;
        this.endIndex = Math.min(this.startIndex + this.pageSize, this.totalRecords);
    }

    updateDisplayedData(): void {
        const startIdx = (this.page - 1) * this.pageSize;
        const endIdx = startIdx + this.pageSize;
        this.displayedData = this.filteredData.slice(startIdx, endIdx);
    }

    onPageChange(newPage: number): void {
        this.page = newPage;
        this.updatePagination();
        this.updateDisplayedData();
    }

    onFilterChange(): void {
        this.performSearch();
    }

    // Cascading filter: Kecamatan changes -> filter Kelurahan list
    onKecamatanFilterChange(): void {
        this.filterKdKel = '';
        if (this.filterKdKec) {
            this.kelurahanList = this.allKelurahanList.filter(k => k.kd_kec === this.filterKdKec);
        } else {
            this.kelurahanList = [];
        }
        this.performSearch();
    }

    onKelurahanFilterChange(): void {
        console.log('Kelurahan filter changed:', this.filterKdKel);
        this.performSearch();
    }

    performSearch(): void {
        this.isSearching = true;
        let result = [...this.originalData];

        // Filter by kecamatan
        if (this.filterKdKec) {
            result = result.filter(item => item.kd_kec === this.filterKdKec);
        }

        // Filter by kelurahan
        if (this.filterKdKel) {
            result = result.filter(item => item.kd_kel === this.filterKdKel);
        }

        // Filter by kd_blok (contains match)
        if (this.filterKdBlok.trim() !== '') {
            result = result.filter(item =>
                item.kd_blok.toLowerCase().includes(this.filterKdBlok.toLowerCase())
            );
        }

        this.filteredData = result;
        this.totalRecords = this.filteredData.length;
        this.page = 1;
        this.updatePagination();
        this.updateDisplayedData();
        this.isSearching = false;
    }

    clearFilters(): void {
        this.filterKdKec = '';
        this.filterKdKel = '';
        this.filterKdBlok = '';
        this.kelurahanList = [];
        this.filteredData = [...this.originalData];
        this.totalRecords = this.filteredData.length;
        this.page = 1;
        this.updatePagination();
        this.updateDisplayedData();
    }

    // Cascading dropdown in form: Kecamatan changes -> filter Kelurahan list
    onFormKecamatanChange(): void {
        const kdKec = this.fg.get('kd_kec')?.value;
        this.fg.patchValue({ kd_kel: '' });

        if (kdKec) {
            this.formKelurahanList = this.allKelurahanList.filter(k => k.kd_kec === kdKec);
        } else {
            this.formKelurahanList = [];
        }
    }

    // Modal operations
    openAddModal(): void {
        this.isEdit = false;
        this.editId = 0;
        this.fg.reset();
        this.formKelurahanList = [];
        this.submitted = false;
        this.currentLabel = '';  // Clear label for new item
        this.modalService.open(this.addEditModal!, {
            centered: true,
            size: 'xl',
            backdrop: 'static'
        }).result.then(() => {
            this.destroyMap();
            this.currentLabel = '';
        }, () => {
            this.destroyMap();
            this.currentLabel = '';
        });

        setTimeout(() => this.initMap(), 300);
    }

    openEditModal(item: Blok): void {
        this.isEdit = true;
        this.editId = item.id;
        this.currentLabel = item.kd_blok;  // Set label for map overlay

        // Load kelurahan for selected kecamatan first
        this.formKelurahanList = this.allKelurahanList.filter(k => k.kd_kec === item.kd_kec);

        this.fg.patchValue({
            kd_kec: item.kd_kec,
            kd_kel: item.kd_kel,
            kd_blok: item.kd_blok
        });
        this.submitted = false;
        this.modalService.open(this.addEditModal!, {
            centered: true,
            size: 'xl',
            backdrop: 'static'
        }).result.then(() => {
            this.destroyMap();
            this.currentLabel = '';
        }, () => {
            this.destroyMap();
            this.currentLabel = '';
        });

        setTimeout(() => {
            this.initMap();
            if (item.geom) {
                this.displayGeometry(item.geom);
            }
        }, 300);
    }

    // Map functions
    private initMap(): void {
        if (this.map) {
            this.destroyMap();
        }

        const container = document.getElementById('mapPreviewBlok');
        if (!container) return;

        this.map = L.map('mapPreviewBlok', {
            center: [-8.1335, 113.2246],
            zoom: 12
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        setTimeout(() => {
            this.map?.invalidateSize();
        }, 100);
    }

    private destroyMap(): void {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        if (this.geoJsonLayer) {
            this.geoJsonLayer = null;
        }
    }

    private displayGeometry(geomJson: string): void {
        if (!this.map) return;

        try {
            const geom = JSON.parse(geomJson);

            if (this.geoJsonLayer) {
                this.map.removeLayer(this.geoJsonLayer);
            }

            this.geoJsonLayer = L.geoJSON(geom, {
                style: {
                    color: '#0ab39c',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.4,
                    fillColor: '#0ab39c'
                }
            }).addTo(this.map);

            const bounds = this.geoJsonLayer.getBounds();
            if (bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [20, 20] });
            }
        } catch (e) {
            console.error('Error parsing geometry:', e);
        }
    }

    onFileChange(event: any): void {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                try {
                    const geojson = JSON.parse(e.target.result);

                    if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
                        this.displayGeometry(JSON.stringify(geojson.features[0].geometry));
                    } else if (geojson.type === 'Feature') {
                        this.displayGeometry(JSON.stringify(geojson.geometry));
                    } else {
                        this.displayGeometry(JSON.stringify(geojson));
                    }
                } catch (error) {
                    console.error('Invalid GeoJSON file:', error);
                    this.customModalService.open('error', 'File GeoJSON tidak valid');
                }
            };
            reader.readAsText(file);
        }
    }

    async onSubmit(): Promise<void> {
        this.submitted = true;

        if (this.fg.invalid) {
            return;
        }

        this.spinner.show();
        const formData = this.fg.value;
        const selectedKec = this.kecamatanList.find(k => k.kd_kec === formData.kd_kec);
        const selectedKel = this.formKelurahanList.find(k => k.kd_kel === formData.kd_kel);

        setTimeout(() => {
            if (this.isEdit) {
                const index = this.originalData.findIndex(item => item.id === this.editId);
                if (index !== -1) {
                    this.originalData[index] = {
                        ...this.originalData[index],
                        kd_kec: formData.kd_kec,
                        kd_kel: formData.kd_kel,
                        kd_blok: formData.kd_blok,
                        kecamatan: selectedKec,
                        kelurahan: selectedKel,
                        updated_at: new Date().toISOString().split('T')[0]
                    };
                }
                this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.UPDATE'));
            } else {
                const newItem: Blok = {
                    id: Math.max(...this.originalData.map(x => x.id)) + 1,
                    kd_kec: formData.kd_kec,
                    kd_kel: formData.kd_kel,
                    kd_blok: formData.kd_blok,
                    geom: null,
                    is_active: true,
                    created_at: new Date().toISOString().split('T')[0],
                    updated_at: new Date().toISOString().split('T')[0],
                    kecamatan: selectedKec,
                    kelurahan: selectedKel
                };
                this.originalData.unshift(newItem);
                this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.ADD'));
            }

            this.modalService.dismissAll();
            this.filteredData = [...this.originalData];
            this.totalRecords = this.filteredData.length;
            this.updatePagination();
            this.updateDisplayedData();
            this.spinner.hide();
        }, 500);
    }

    async deleteItem(item: Blok): Promise<void> {
        try {
            const result = await this.customModalService.open('confirm',
                this.translate.instant('COMMON.CUSTOMMODAL.DELETETEXT'),
                { name: `Blok ${item.kd_blok}` }
            );

            if (result === true) {
                this.spinner.show();

                setTimeout(() => {
                    const index = this.originalData.findIndex(x => x.id === item.id);
                    if (index !== -1) {
                        this.originalData[index].is_active = false;
                    }

                    this.filteredData = [...this.originalData];
                    this.updateDisplayedData();

                    this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.DELETE'));
                    this.spinner.hide();
                }, 500);
            }
        } catch (error) {
            console.log('Delete cancelled');
        }
    }

    async recoverItem(item: Blok): Promise<void> {
        try {
            const result = await this.customModalService.open('confirm',
                'Anda akan memulihkan data ini. Lanjutkan?',
                { name: `Blok ${item.kd_blok}` }
            );

            if (result === true) {
                this.spinner.show();

                setTimeout(() => {
                    const index = this.originalData.findIndex(x => x.id === item.id);
                    if (index !== -1) {
                        this.originalData[index].is_active = true;
                    }

                    this.filteredData = [...this.originalData];
                    this.updateDisplayedData();

                    this.customModalService.open('success', 'Data berhasil dipulihkan');
                    this.spinner.hide();
                }, 500);
            }
        } catch (error) {
            console.log('Recover cancelled');
        }
    }

    closeModal(): void {
        this.modalService.dismissAll();
    }

    trackByFn(index: number, item: Blok): number {
        return item.id;
    }
}
