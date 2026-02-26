import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ModalService } from 'src/app/shared/services/modal.service';
import { SettingService, BlokData } from 'src/app/services/setting.service';
import { RestApiService } from 'src/app/services/rest-api.service';
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
}

interface Blok {
    id: string;
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
    editId: string = '';
    currentLabel: string = '';
    private currentGeomWkb: string | null = null;
    private uploadedGeojson: any = null;  // Stores uploaded GeoJSON geometry for new blok

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
        private settingService: SettingService,
        private restApiService: RestApiService
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
        // Load Kecamatan list - API returns {value, label} format where value=kd_kec, label="kd_kec - nama"
        this.restApiService.getKecamatanList('true').subscribe({
            next: (response: any[]) => {
                // Filter out placeholder (empty value) and map to our interface
                this.kecamatanList = response
                    .filter(item => item.value && item.value !== '')
                    .map(item => ({
                        id: item.value,
                        kd_kec: item.value,
                        nama: item.label ? item.label.replace(`${item.value} - `, '') : item.value
                    }));
                console.log('Loaded kecamatan list:', this.kecamatanList);
            },
            error: (err) => console.error('Error loading kecamatan:', err)
        });

        // Kelurahan will be loaded on-demand when kecamatan is selected in the form
        this.allKelurahanList = [];
        this.kelurahanList = [];
    }

    loadData(): void {
        this.spinner.show();
        const filters: any = {};
        if (this.filterKdKec) filters.kd_kec = this.filterKdKec;
        if (this.filterKdKel) filters.kd_kel = this.filterKdKel;
        if (this.filterKdBlok.trim()) filters.kd_blok = this.filterKdBlok.trim();

        this.settingService.getBlokPaginated(this.page - 1, this.pageSize, filters).subscribe({
            next: (response) => {
                this.originalData = response.items as Blok[];
                this.filteredData = [...this.originalData];
                this.displayedData = [...this.originalData];
                this.totalRecords = response.totalCount;
                this.updatePagination();
                this.spinner.hide();
            },
            error: (error) => {
                console.error('Error loading blok:', error);
                this.customModalService.open('error', 'Gagal memuat data blok');
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

    // Cascading filter: Kecamatan changes -> load Kelurahan from API
    onKecamatanFilterChange(): void {
        this.filterKdKel = '';
        if (this.filterKdKec) {
            // Load kelurahan for selected kecamatan from API
            this.restApiService.getKelurahanListByKec(this.filterKdKec, 'true').subscribe({
                next: (response: any[]) => {
                    this.kelurahanList = response
                        .filter(item => item.value && item.value !== '')
                        .map(item => ({
                            id: item.id_kelurahan || item.value,
                            kd_kec: item.kd_kec || this.filterKdKec,
                            kd_kel: item.value,
                            nama: item.label ? item.label.replace(`${item.value} - `, '') : item.value
                        }));
                },
                error: (err) => {
                    console.error('Error loading kelurahan for filter:', err);
                    this.kelurahanList = [];
                }
            });
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
        this.page = 1;
        this.loadData();
        this.isSearching = false;
    }

    clearFilters(): void {
        this.filterKdKec = '';
        this.filterKdKel = '';
        this.filterKdBlok = '';
        this.kelurahanList = [];
        this.page = 1;
        this.loadData();
    }

    // Cascading dropdown in form: Kecamatan changes -> load Kelurahan from API
    onFormKecamatanChange(): void {
        const kdKec = this.fg.get('kd_kec')?.value;
        this.fg.patchValue({ kd_kel: '' });

        if (kdKec) {
            // Load kelurahan for selected kecamatan from API
            this.restApiService.getKelurahanListByKec(kdKec, 'true').subscribe({
                next: (response: any[]) => {
                    // Filter out placeholder and map to our interface
                    this.formKelurahanList = response
                        .filter(item => item.value && item.value !== '')
                        .map(item => ({
                            id: item.id_kelurahan || item.value,
                            kd_kec: item.kd_kec || kdKec,
                            kd_kel: item.value,
                            nama: item.label ? item.label.replace(`${item.value} - `, '') : item.value
                        }));
                    console.log('Loaded kelurahan for kec', kdKec, ':', this.formKelurahanList);
                },
                error: (err) => {
                    console.error('Error loading kelurahan:', err);
                    this.formKelurahanList = [];
                }
            });
        } else {
            this.formKelurahanList = [];
        }
    }

    // Modal operations
    openAddModal(): void {
        this.isEdit = false;
        this.editId = '';
        this.currentGeomWkb = null;
        this.uploadedGeojson = null;  // Reset uploaded geometry
        this.fg.reset();
        this.formKelurahanList = [];
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
            this.uploadedGeojson = null;
        }, () => {
            this.destroyMap();
            this.currentLabel = '';
            this.currentGeomWkb = null;
            this.uploadedGeojson = null;
        });

        setTimeout(() => this.initMap(), 300);
    }

    openEditModal(item: Blok): void {
        this.isEdit = true;
        this.editId = item.id;
        this.currentGeomWkb = item.geom;
        this.uploadedGeojson = null;  // Reset - will use existing geom unless new file uploaded
        this.currentLabel = item.kd_blok;

        // Load kelurahan for this blok's kecamatan from API
        if (item.kd_kec) {
            this.restApiService.getKelurahanListByKec(item.kd_kec, 'true').subscribe({
                next: (response: any[]) => {
                    this.formKelurahanList = response
                        .filter(kel => kel.value && kel.value !== '')
                        .map(kel => ({
                            id: kel.id_kelurahan || kel.value,
                            kd_kec: kel.kd_kec || item.kd_kec,
                            kd_kel: kel.value,
                            nama: kel.label ? kel.label.replace(`${kel.value} - `, '') : kel.value
                        }));
                    console.log('Loaded kelurahan for edit modal:', this.formKelurahanList);
                },
                error: (err) => {
                    console.error('Error loading kelurahan for edit:', err);
                    this.formKelurahanList = [];
                }
            });
        } else {
            this.formKelurahanList = [];
        }

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
            this.currentGeomWkb = null;
        }, () => {
            this.destroyMap();
            this.currentLabel = '';
            this.currentGeomWkb = null;
        });

        setTimeout(() => {
            this.initMap();
            // Display existing geometry if available
            if (this.currentGeomWkb) {
                setTimeout(() => this.displayExistingGeometry(), 200);
            }
        }, 300);
    }

    /**
     * Display existing geometry by fetching GeoJSON from backend
     */
    private displayExistingGeometry(): void {
        if (!this.map || !this.editId) return;

        // Call backend to get geometry converted to GeoJSON
        this.settingService.getBlokGeoJson(this.editId).subscribe({
            next: (data: any) => {
                if (data.geojson) {
                    // Display the GeoJSON geometry on the map
                    this.displayGeometry(JSON.stringify(data.geojson));
                    console.log('Displayed geometry for blok:', data.kd_blok);
                } else {
                    console.log('No geometry available for this blok');
                }
            },
            error: (err) => {
                console.error('Error fetching blok geometry:', err);
            }
        });
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
        console.log('displayGeometry called, map exists:', !!this.map);
        if (!this.map) {
            console.warn('Map not initialized, cannot display geometry');
            return;
        }

        try {
            const geom = JSON.parse(geomJson);
            console.log('Parsed geometry type:', geom.type, 'coordinates:', geom.coordinates?.length || 'N/A');

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

            console.log('GeoJSON layer added to map');

            // Force map to recalculate size and fit bounds
            this.map.invalidateSize();

            const bounds = this.geoJsonLayer.getBounds();
            console.log('Bounds valid:', bounds.isValid());
            if (bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [20, 20] });
                console.log('Map fitted to bounds:', bounds.toBBoxString());
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
                    let geometry: any = null;

                    if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
                        geometry = geojson.features[0].geometry;
                    } else if (geojson.type === 'Feature') {
                        geometry = geojson.geometry;
                    } else {
                        geometry = geojson;
                    }

                    // Store the geometry for saving
                    this.uploadedGeojson = geometry;
                    console.log('Uploaded GeoJSON geometry:', this.uploadedGeojson);

                    // Display on map preview
                    this.displayGeometry(JSON.stringify(geometry));
                } catch (error) {
                    console.error('Invalid GeoJSON file:', error);
                    this.customModalService.open('error', 'File GeoJSON tidak valid');
                    this.uploadedGeojson = null;
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

        // Prepare data - include geojson for new uploads, or geom for existing
        const data: any = {
            kd_kec: formData.kd_kec,
            kd_kel: formData.kd_kel,
            kd_blok: formData.kd_blok
        };

        // If user uploaded a new GeoJSON file, send that
        if (this.uploadedGeojson) {
            data.geojson = this.uploadedGeojson;
            console.log('Sending uploaded GeoJSON to backend');
        } else if (this.currentGeomWkb) {
            // Otherwise use existing WKB if editing
            data.geom = this.currentGeomWkb;
        }

        if (this.isEdit) {
            this.settingService.updateBlok(this.editId, data).subscribe({
                next: () => {
                    this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.UPDATE'));
                    this.modalService.dismissAll();
                    this.loadData();
                    this.spinner.hide();
                },
                error: (error) => {
                    console.error('Error updating blok:', error);
                    this.customModalService.open('error', 'Gagal mengupdate blok');
                    this.spinner.hide();
                }
            });
        } else {
            this.settingService.createBlok(data).subscribe({
                next: () => {
                    this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.ADD'));
                    this.modalService.dismissAll();
                    this.loadData();
                    this.spinner.hide();
                },
                error: (error) => {
                    console.error('Error creating blok:', error);
                    // Extract error message from backend response
                    const errorMsg = error?.error?.error || error?.error?.message || 'Gagal menambah blok';
                    this.customModalService.open('error', errorMsg);
                    this.spinner.hide();
                }
            });
        }
    }

    async deleteItem(item: Blok): Promise<void> {
        try {
            const result = await this.customModalService.open('confirm',
                this.translate.instant('COMMON.CUSTOMMODAL.DELETETEXT'),
                { name: `Blok ${item.kd_blok}` }
            );

            if (result === true) {
                this.spinner.show();
                this.settingService.deleteBlok(item.id).subscribe({
                    next: () => {
                        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.DELETE'));
                        this.loadData();
                        this.spinner.hide();
                    },
                    error: (error) => {
                        console.error('Error deleting blok:', error);
                        this.customModalService.open('error', 'Gagal menghapus blok');
                        this.spinner.hide();
                    }
                });
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
                this.settingService.recoverBlok(item.id).subscribe({
                    next: () => {
                        this.customModalService.open('success', 'Data berhasil dipulihkan');
                        this.loadData();
                        this.spinner.hide();
                    },
                    error: (error) => {
                        console.error('Error recovering blok:', error);
                        this.customModalService.open('error', 'Gagal memulihkan blok');
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

    trackByFn(index: number, item: Blok): string {
        return item.id;
    }
}
