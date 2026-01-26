import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, AfterViewInit, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ModalService } from 'src/app/shared/services/modal.service';
import { SettingService, KecamatanData } from 'src/app/services/setting.service';
import * as L from 'leaflet';

// Kecamatan Interface (using string id for UUID)
interface Kecamatan {
    id: string;
    kd_kec: string;
    nama: string;
    color: string;
    geom: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

@Component({
    selector: 'app-kecamatan',
    templateUrl: './kecamatan.component.html',
    styleUrls: ['./kecamatan.component.scss']
})
export class KecamatanComponent implements OnInit, OnDestroy, AfterViewInit {
    // Expose Math for template
    Math = Math;

    breadCrumbTitle!: string;
    breadCrumbItems!: Array<{}>;
    private langChangeSubscription!: Subscription;

    // Table data
    originalData: Kecamatan[] = [];
    filteredData: Kecamatan[] = [];
    displayedData: Kecamatan[] = [];

    // Pagination
    page: number = 1;
    pageSize: number = 10;
    totalRecords: number = 0;
    startIndex: number = 0;
    endIndex: number = 0;

    // Search & Column Filters
    filterKdKec: string = '';
    filterNama: string = '';
    private searchSubject = new Subject<string>();
    isSearching: boolean = false;

    // Form
    fg!: FormGroup;
    submitted = false;
    isEdit = false;
    editId: string = '';
    currentLabel: string = '';  // For map label overlay

    // Map
    private map: L.Map | null = null;
    private geoJsonLayer: L.GeoJSON | null = null;
    @ViewChild('mapContainer') mapContainer!: ElementRef;

    @ViewChild('addEditModal', { static: false })
    addEditModal?: TemplateRef<any>;

    // Current geometry WKB (for saving to database)
    private currentGeomWkb: string | null = null;

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
        this.loadData();
        this.setupSearch();

        this.langChangeSubscription = this.translate.onLangChange.subscribe(() => {
            this.initializeBreadcrumb();
        });
    }

    ngAfterViewInit(): void {
        // Map will be initialized when modal opens
    }

    ngOnDestroy(): void {
        if (this.langChangeSubscription) {
            this.langChangeSubscription.unsubscribe();
        }
        this.searchSubject.complete();
        this.destroyMap();
    }

    initializeBreadcrumb(): void {
        this.breadCrumbTitle = this.translate.instant('APPPAGE.SETTING.KECAMATAN.TITLE');
        this.breadCrumbItems = [
            { label: this.translate.instant('MENUITEMS.SETTING.TEXT'), active: false },
            { label: this.translate.instant('APPPAGE.SETTING.KECAMATAN.TITLE'), active: true }
        ];
    }

    initializeForm(): void {
        this.fg = this.formBuilder.group({
            kd_kec: ['', [Validators.required, Validators.maxLength(10)]],
            nama: ['', [Validators.required, Validators.maxLength(255)]],
            color: ['#3388ff', [Validators.required]],
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

    loadData(): void {
        this.spinner.show();
        const filters: any = {};
        if (this.filterKdKec.trim()) filters.kd_kec = this.filterKdKec.trim();
        if (this.filterNama.trim()) filters.nama = this.filterNama.trim();

        this.settingService.getKecamatanPaginated(this.page - 1, this.pageSize, filters).subscribe({
            next: (response) => {
                this.originalData = response.items as Kecamatan[];
                this.filteredData = [...this.originalData];
                this.displayedData = [...this.originalData];
                this.totalRecords = response.totalCount;
                this.updatePagination();
                this.spinner.hide();
            },
            error: (error) => {
                console.error('Error loading kecamatan:', error);
                this.customModalService.open('error', 'Gagal memuat data kecamatan');
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
        this.loadData(); // Reload from API with new page
    }

    onFilterChange(): void {
        this.performSearch();
    }

    performSearch(): void {
        this.isSearching = true;
        this.page = 1;
        this.loadData(); // Reload from API with filters
        this.isSearching = false;
    }

    clearFilters(): void {
        this.filterKdKec = '';
        this.filterNama = '';
        this.page = 1;
        this.loadData(); // Reload from API without filters
    }

    // Color helper methods
    getColorRgba(): string {
        const hexColor = this.fg.get('color')?.value || '#3388ff';
        // Convert hex to RGBA format like the legacy system
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        return `RGBA(${r}, ${g}, ${b}, 0.5)`;
    }

    openColorPicker(): void {
        // Trigger color input click
        const colorInput = document.getElementById('color') as HTMLInputElement;
        if (colorInput) {
            colorInput.click();
        }
    }

    // Modal operations
    openAddModal(): void {
        this.isEdit = false;
        this.editId = '';
        this.currentGeomWkb = null;
        this.fg.reset({ color: '#3388ff' });
        this.submitted = false;
        this.currentLabel = '';  // Clear label for new item
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

        // Initialize map after modal opens
        setTimeout(() => this.initMap(), 300);
    }

    openEditModal(item: Kecamatan): void {
        this.isEdit = true;
        this.editId = item.id;
        this.currentGeomWkb = item.geom; // Store current geometry
        this.currentLabel = item.nama;  // Set label for map overlay
        this.fg.patchValue({
            kd_kec: item.kd_kec,
            nama: item.nama,
            color: this.rgbaToHex(item.color) || '#3388ff'
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

        // Initialize map and show existing geometry
        setTimeout(() => {
            this.initMap();
            if (item.geom) {
                this.displayGeometryFromWkb(item.geom, item.color);
            }
        }, 300);
    }

    // Convert RGBA to hex for color picker
    rgbaToHex(rgba: string): string {
        if (!rgba) return '#3388ff';
        // Extract RGB values from rgba string
        const match = rgba.match(/\d+/g);
        if (match && match.length >= 3) {
            const r = parseInt(match[0]).toString(16).padStart(2, '0');
            const g = parseInt(match[1]).toString(16).padStart(2, '0');
            const b = parseInt(match[2]).toString(16).padStart(2, '0');
            return `#${r}${g}${b}`;
        }
        return '#3388ff';
    }

    // Map functions
    private initMap(): void {
        if (this.map) {
            this.destroyMap();
        }

        const container = document.getElementById('mapPreview');
        if (!container) return;

        this.map = L.map('mapPreview', {
            center: [-8.1335, 113.2246], // Lumajang coordinates
            zoom: 10
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        // Force map to resize properly
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

    private displayGeometry(geomJson: string, color: string): void {
        if (!this.map) return;

        try {
            const geom = JSON.parse(geomJson);

            if (this.geoJsonLayer) {
                this.map.removeLayer(this.geoJsonLayer);
            }

            this.geoJsonLayer = L.geoJSON(geom, {
                style: {
                    color: color || '#3388ff',
                    weight: 2,
                    opacity: 0.8,
                    fillOpacity: 0.4,
                    fillColor: color || '#3388ff'
                }
            }).addTo(this.map);

            // Fit map to geometry bounds
            const bounds = this.geoJsonLayer.getBounds();
            if (bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [20, 20] });
            }
        } catch (e) {
            console.error('Error parsing geometry:', e);
        }
    }

    /**
     * Display geometry from WKB hex string (from database)
     * Note: WKB needs to be converted to GeoJSON for display
     * For now, we'll just skip if it's WKB (the backend will need to return GeoJSON)
     */
    private displayGeometryFromWkb(geomWkb: string, color: string): void {
        if (!this.map || !geomWkb) return;
        // WKB is stored in hex format, for now we'll need backend to convert
        // In the future, could use a JS library like wkx to parse WKB
        console.log('Geometry WKB exists, but display requires conversion on backend');
    }

    onFileChange(event: any): void {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e: any) => {
                try {
                    const geojson = JSON.parse(e.target.result);
                    const color = this.fg.get('color')?.value || '#3388ff';

                    // Display on map
                    if (geojson.type === 'FeatureCollection' && geojson.features?.length > 0) {
                        this.displayGeometry(JSON.stringify(geojson.features[0].geometry), color);
                    } else if (geojson.type === 'Feature') {
                        this.displayGeometry(JSON.stringify(geojson.geometry), color);
                    } else {
                        this.displayGeometry(JSON.stringify(geojson), color);
                    }
                } catch (error) {
                    console.error('Invalid GeoJSON file:', error);
                    this.customModalService.open('error', 'File GeoJSON tidak valid');
                }
            };
            reader.readAsText(file);
        }
    }

    onColorChange(): void {
        // Update map color when color picker changes
        if (this.geoJsonLayer && this.map) {
            const color = this.fg.get('color')?.value || '#3388ff';
            this.geoJsonLayer.setStyle({
                color: color,
                fillColor: color
            });
        }
    }

    async onSubmit(): Promise<void> {
        this.submitted = true;

        if (this.fg.invalid) {
            return;
        }

        this.spinner.show();
        const formData = this.fg.value;

        const data: KecamatanData = {
            kd_kec: formData.kd_kec,
            nama: formData.nama,
            color: this.getColorRgba(), // Convert to RGBA format for legacy compatibility
            geom: this.currentGeomWkb || undefined
        };

        if (this.isEdit) {
            // Update existing
            this.settingService.updateKecamatan(this.editId, data).subscribe({
                next: () => {
                    this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.UPDATE'));
                    this.modalService.dismissAll();
                    this.loadData(); // Reload from API
                    this.spinner.hide();
                },
                error: (error) => {
                    console.error('Error updating kecamatan:', error);
                    this.customModalService.open('error', 'Gagal mengupdate kecamatan');
                    this.spinner.hide();
                }
            });
        } else {
            // Create new
            this.settingService.createKecamatan(data).subscribe({
                next: () => {
                    this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.ADD'));
                    this.modalService.dismissAll();
                    this.loadData(); // Reload from API
                    this.spinner.hide();
                },
                error: (error) => {
                    console.error('Error creating kecamatan:', error);
                    this.customModalService.open('error', 'Gagal menambah kecamatan');
                    this.spinner.hide();
                }
            });
        }
    }

    async deleteItem(item: Kecamatan): Promise<void> {
        try {
            const result = await this.customModalService.open('confirm',
                this.translate.instant('COMMON.CUSTOMMODAL.DELETETEXT'),
                { name: item.nama }
            );

            if (result === true) {
                this.spinner.show();
                this.settingService.deleteKecamatan(item.id).subscribe({
                    next: () => {
                        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.DELETE'));
                        this.loadData(); // Reload from API
                        this.spinner.hide();
                    },
                    error: (error) => {
                        console.error('Error deleting kecamatan:', error);
                        this.customModalService.open('error', 'Gagal menghapus kecamatan');
                        this.spinner.hide();
                    }
                });
            }
        } catch (error) {
            console.log('Delete cancelled');
        }
    }

    async recoverItem(item: Kecamatan): Promise<void> {
        try {
            const result = await this.customModalService.open('confirm',
                'Anda akan memulihkan data ini. Lanjutkan?',
                { name: item.nama }
            );

            if (result === true) {
                this.spinner.show();
                this.settingService.recoverKecamatan(item.id).subscribe({
                    next: () => {
                        this.customModalService.open('success', 'Data berhasil dipulihkan');
                        this.loadData(); // Reload from API
                        this.spinner.hide();
                    },
                    error: (error) => {
                        console.error('Error recovering kecamatan:', error);
                        this.customModalService.open('error', 'Gagal memulihkan kecamatan');
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

    trackByFn(index: number, item: Kecamatan): string {
        return item.id;
    }
}
