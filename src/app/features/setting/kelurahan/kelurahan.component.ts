import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ModalService } from 'src/app/shared/services/modal.service';
import { SettingService, KelurahanData } from 'src/app/services/setting.service';
import * as L from 'leaflet';

// Interfaces
interface Kecamatan {
    id: string;
    kd_kec: string;
    nama: string;
}

interface Kelurahan {
    id: string;
    kd_kec: string;
    kd_kel: string;
    nama: string;
    geom: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    kecamatan?: Kecamatan;
}

@Component({
    selector: 'app-kelurahan',
    templateUrl: './kelurahan.component.html',
    styleUrls: ['./kelurahan.component.scss']
})
export class KelurahanComponent implements OnInit, OnDestroy {
    // Expose Math for template
    Math = Math;

    breadCrumbTitle!: string;
    breadCrumbItems!: Array<{}>;
    private langChangeSubscription!: Subscription;

    // Table data
    originalData: Kelurahan[] = [];
    filteredData: Kelurahan[] = [];
    displayedData: Kelurahan[] = [];

    // Dropdown data
    kecamatanList: Kecamatan[] = [];

    // Pagination
    page: number = 1;
    pageSize: number = 10;
    totalRecords: number = 0;
    startIndex: number = 0;
    endIndex: number = 0;

    // Search & Column Filters
    filterKdKec: string = '';
    filterKdKel: string = '';
    filterNama: string = '';
    private searchSubject = new Subject<string>();
    isSearching: boolean = false;

    // Form
    fg!: FormGroup;
    submitted = false;
    isEdit = false;
    editId: string = '';
    currentLabel: string = '';  // For map label overlay
    private currentGeomWkb: string | null = null;

    // Map
    private map: L.Map | null = null;
    private geoJsonLayer: L.GeoJSON | null = null;

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
        this.loadKecamatanList();
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
        this.breadCrumbTitle = this.translate.instant('APPPAGE.SETTING.KELURAHAN.TITLE');
        this.breadCrumbItems = [
            { label: this.translate.instant('MENUITEMS.SETTING.TEXT'), active: false },
            { label: this.translate.instant('APPPAGE.SETTING.KELURAHAN.TITLE'), active: true }
        ];
    }

    initializeForm(): void {
        this.fg = this.formBuilder.group({
            kd_kec: ['', [Validators.required]],
            kd_kel: ['', [Validators.required, Validators.maxLength(10)]],
            nama: ['', [Validators.required, Validators.maxLength(255)]],
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

    loadKecamatanList(): void {
        // Load kecamatan from existing API endpoint
        // For now, this will be populated from the kecamatan list API
        this.kecamatanList = [];
    }

    loadData(): void {
        this.spinner.show();
        const filters: any = {};
        if (this.filterKdKec) filters.kd_kec = this.filterKdKec;
        if (this.filterKdKel.trim()) filters.kd_kel = this.filterKdKel.trim();
        if (this.filterNama.trim()) filters.nama = this.filterNama.trim();

        this.settingService.getKelurahanPaginated(this.page - 1, this.pageSize, filters).subscribe({
            next: (response) => {
                this.originalData = response.items as Kelurahan[];
                this.filteredData = [...this.originalData];
                this.displayedData = [...this.originalData];
                this.totalRecords = response.totalCount;
                this.updatePagination();
                this.spinner.hide();
            },
            error: (error) => {
                console.error('Error loading kelurahan:', error);
                this.customModalService.open('error', 'Gagal memuat data kelurahan');
                this.spinner.hide();
            }
        });
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
        this.filterKdKec = '';
        this.filterKdKel = '';
        this.filterNama = '';
        this.page = 1;
        this.loadData();
    }

    getKecamatanDisplay(item: Kelurahan): string {
        return item.kecamatan ? `${item.kd_kec} - ${item.kecamatan.nama}` : item.kd_kec;
    }

    // Modal operations
    openAddModal(): void {
        this.isEdit = false;
        this.editId = '';
        this.currentGeomWkb = null;
        this.fg.reset();
        this.submitted = false;
        this.currentLabel = '';
        this.modalService.open(this.addEditModal!, {
            centered: true,
            size: 'xl',
            backdrop: 'static'
        }).result.then(() => {
            this.destroyMap();
            this.currentLabel = '';
            this.currentGeomWkb = null;
        }, () => {
            this.destroyMap();
            this.currentLabel = '';
            this.currentGeomWkb = null;
        });

        setTimeout(() => this.initMap(), 300);
    }

    openEditModal(item: Kelurahan): void {
        this.isEdit = true;
        this.editId = item.id;
        this.currentGeomWkb = item.geom;
        this.currentLabel = item.nama;
        this.fg.patchValue({
            kd_kec: item.kd_kec,
            kd_kel: item.kd_kel,
            nama: item.nama
        });
        this.submitted = false;
        this.modalService.open(this.addEditModal!, {
            centered: true,
            size: 'xl',
            backdrop: 'static'
        }).result.then(() => {
            this.destroyMap();
            this.currentLabel = '';
            this.currentGeomWkb = null;
        }, () => {
            this.destroyMap();
            this.currentLabel = '';
            this.currentGeomWkb = null;
        });

        setTimeout(() => {
            this.initMap();
            // Note: geom from DB is WKB, would need conversion for display
        }, 300);
    }

    // Map functions
    private initMap(): void {
        if (this.map) {
            this.destroyMap();
        }

        const container = document.getElementById('mapPreviewKelurahan');
        if (!container) return;

        this.map = L.map('mapPreviewKelurahan', {
            center: [-8.1335, 113.2246],
            zoom: 11
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
                    color: '#405189',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.4,
                    fillColor: '#405189'
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
        if (this.fg.invalid) return;

        this.spinner.show();
        const formData = this.fg.value;

        const data: KelurahanData = {
            kd_kec: formData.kd_kec,
            kd_kel: formData.kd_kel,
            nama: formData.nama,
            geom: this.currentGeomWkb || undefined
        };

        if (this.isEdit) {
            this.settingService.updateKelurahan(this.editId, data).subscribe({
                next: () => {
                    this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.UPDATE'));
                    this.modalService.dismissAll();
                    this.loadData();
                    this.spinner.hide();
                },
                error: (error) => {
                    console.error('Error updating kelurahan:', error);
                    this.customModalService.open('error', 'Gagal mengupdate kelurahan');
                    this.spinner.hide();
                }
            });
        } else {
            this.settingService.createKelurahan(data).subscribe({
                next: () => {
                    this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.ADD'));
                    this.modalService.dismissAll();
                    this.loadData();
                    this.spinner.hide();
                },
                error: (error) => {
                    console.error('Error creating kelurahan:', error);
                    this.customModalService.open('error', 'Gagal menambah kelurahan');
                    this.spinner.hide();
                }
            });
        }
    }

    async deleteItem(item: Kelurahan): Promise<void> {
        try {
            const result = await this.customModalService.open('confirm',
                this.translate.instant('COMMON.CUSTOMMODAL.DELETETEXT'),
                { name: item.nama }
            );

            if (result === true) {
                this.spinner.show();
                this.settingService.deleteKelurahan(item.id).subscribe({
                    next: () => {
                        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.DELETE'));
                        this.loadData();
                        this.spinner.hide();
                    },
                    error: (error) => {
                        console.error('Error deleting kelurahan:', error);
                        this.customModalService.open('error', 'Gagal menghapus kelurahan');
                        this.spinner.hide();
                    }
                });
            }
        } catch (error) {
            console.log('Delete cancelled');
        }
    }

    async recoverItem(item: Kelurahan): Promise<void> {
        try {
            const result = await this.customModalService.open('confirm',
                'Anda akan memulihkan data ini. Lanjutkan?',
                { name: item.nama }
            );

            if (result === true) {
                this.spinner.show();
                this.settingService.recoverKelurahan(item.id).subscribe({
                    next: () => {
                        this.customModalService.open('success', 'Data berhasil dipulihkan');
                        this.loadData();
                        this.spinner.hide();
                    },
                    error: (error) => {
                        console.error('Error recovering kelurahan:', error);
                        this.customModalService.open('error', 'Gagal memulihkan kelurahan');
                        this.spinner.hide();
                    }
                });
            }
        } catch (error) {
            console.log('Recover cancelled');
        }
    }

    closeModal(): void {
        this.modalService.dismissAll();
    }

    trackByFn(index: number, item: Kelurahan): string {
        return item.id;
    }
}
