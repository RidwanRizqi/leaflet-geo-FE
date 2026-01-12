import { Component, OnInit, OnDestroy, ViewChild, TemplateRef, AfterViewInit, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ModalService } from 'src/app/shared/services/modal.service';
import * as L from 'leaflet';

// Kecamatan Interface
interface Kecamatan {
    id: number;
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
    editId: number = 0;
    currentLabel: string = '';  // For map label overlay

    // Map
    private map: L.Map | null = null;
    private geoJsonLayer: L.GeoJSON | null = null;
    @ViewChild('mapContainer') mapContainer!: ElementRef;

    @ViewChild('addEditModal', { static: false })
    addEditModal?: TemplateRef<any>;

    // Dummy data
    private dummyData: Kecamatan[] = [
        { id: 1, kd_kec: '010', nama: 'Tempursari', color: 'rgba(255, 99, 132, 0.6)', geom: '{"type":"Polygon","coordinates":[[[113.1,−8.0],[113.2,−8.0],[113.2,−8.1],[113.1,−8.1],[113.1,−8.0]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15' },
        { id: 2, kd_kec: '020', nama: 'Pronojiwo', color: 'rgba(54, 162, 235, 0.6)', geom: '{"type":"Polygon","coordinates":[[[113.2,−8.0],[113.3,−8.0],[113.3,−8.1],[113.2,−8.1],[113.2,−8.0]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15' },
        { id: 3, kd_kec: '030', nama: 'Candipuro', color: 'rgba(255, 206, 86, 0.6)', geom: null, is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15' },
        { id: 4, kd_kec: '040', nama: 'Pasirian', color: 'rgba(75, 192, 192, 0.6)', geom: '{"type":"Polygon","coordinates":[[[113.3,−8.0],[113.4,−8.0],[113.4,−8.1],[113.3,−8.1],[113.3,−8.0]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15' },
        { id: 5, kd_kec: '050', nama: 'Tempeh', color: 'rgba(153, 102, 255, 0.6)', geom: '{"type":"Polygon","coordinates":[[[113.4,−8.0],[113.5,−8.0],[113.5,−8.1],[113.4,−8.1],[113.4,−8.0]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15' },
        { id: 6, kd_kec: '060', nama: 'Lumajang', color: 'rgba(255, 159, 64, 0.6)', geom: '{"type":"Polygon","coordinates":[[[113.15,−8.05],[113.25,−8.05],[113.25,−8.15],[113.15,−8.15],[113.15,−8.05]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15' },
        { id: 7, kd_kec: '070', nama: 'Sumbersuko', color: 'rgba(199, 199, 199, 0.6)', geom: null, is_active: false, created_at: '2024-01-15', updated_at: '2024-01-15' },
        { id: 8, kd_kec: '080', nama: 'Tekung', color: 'rgba(83, 102, 255, 0.6)', geom: '{"type":"Polygon","coordinates":[[[113.5,−8.0],[113.6,−8.0],[113.6,−8.1],[113.5,−8.1],[113.5,−8.0]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15' },
        { id: 9, kd_kec: '090', nama: 'Kunir', color: 'rgba(255, 99, 255, 0.6)', geom: '{"type":"Polygon","coordinates":[[[113.6,−8.0],[113.7,−8.0],[113.7,−8.1],[113.6,−8.1],[113.6,−8.0]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15' },
        { id: 10, kd_kec: '100', nama: 'Yosowilangun', color: 'rgba(99, 255, 132, 0.6)', geom: null, is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15' },
        { id: 11, kd_kec: '110', nama: 'Rowokangkung', color: 'rgba(162, 235, 54, 0.6)', geom: '{"type":"Polygon","coordinates":[[[113.7,−8.0],[113.8,−8.0],[113.8,−8.1],[113.7,−8.1],[113.7,−8.0]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15' },
        { id: 12, kd_kec: '120', nama: 'Jatiroto', color: 'rgba(206, 86, 255, 0.6)', geom: '{"type":"Polygon","coordinates":[[[113.8,−8.0],[113.9,−8.0],[113.9,−8.1],[113.8,−8.1],[113.8,−8.0]]]}', is_active: true, created_at: '2024-01-15', updated_at: '2024-01-15' }
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
        // Simulate API delay
        setTimeout(() => {
            this.originalData = [...this.dummyData];
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

    performSearch(): void {
        this.isSearching = true;
        let result = [...this.originalData];

        // Filter by kd_kec (contains match)
        if (this.filterKdKec.trim() !== '') {
            result = result.filter(item =>
                item.kd_kec.toLowerCase().includes(this.filterKdKec.toLowerCase())
            );
        }

        // Filter by nama (contains match)
        if (this.filterNama.trim() !== '') {
            result = result.filter(item =>
                item.nama.toLowerCase().includes(this.filterNama.toLowerCase())
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
        this.filterNama = '';
        this.filteredData = [...this.originalData];
        this.totalRecords = this.filteredData.length;
        this.page = 1;
        this.updatePagination();
        this.updateDisplayedData();
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
        this.editId = 0;
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
        }, () => {
            this.destroyMap();
            this.currentLabel = '';
        });

        // Initialize map after modal opens
        setTimeout(() => this.initMap(), 300);
    }

    openEditModal(item: Kecamatan): void {
        this.isEdit = true;
        this.editId = item.id;
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
        }, () => {
            this.destroyMap();
            this.currentLabel = '';
        });

        // Initialize map and show existing geometry
        setTimeout(() => {
            this.initMap();
            if (item.geom) {
                this.displayGeometry(item.geom, item.color);
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

        // Simulate API call
        setTimeout(() => {
            if (this.isEdit) {
                // Update existing
                const index = this.originalData.findIndex(item => item.id === this.editId);
                if (index !== -1) {
                    this.originalData[index] = {
                        ...this.originalData[index],
                        kd_kec: formData.kd_kec,
                        nama: formData.nama,
                        color: formData.color,
                        updated_at: new Date().toISOString().split('T')[0]
                    };
                }
                this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.UPDATE'));
            } else {
                // Create new
                const newItem: Kecamatan = {
                    id: Math.max(...this.originalData.map(x => x.id)) + 1,
                    kd_kec: formData.kd_kec,
                    nama: formData.nama,
                    color: formData.color,
                    geom: null,
                    is_active: true,
                    created_at: new Date().toISOString().split('T')[0],
                    updated_at: new Date().toISOString().split('T')[0]
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

    async deleteItem(item: Kecamatan): Promise<void> {
        try {
            const result = await this.customModalService.open('confirm',
                this.translate.instant('COMMON.CUSTOMMODAL.DELETETEXT'),
                { name: item.nama }
            );

            if (result === true) {
                this.spinner.show();

                // Soft delete - set is_active to false
                setTimeout(() => {
                    const index = this.originalData.findIndex(x => x.id === item.id);
                    if (index !== -1) {
                        this.originalData[index].is_active = false;
                    }

                    this.filteredData = [...this.originalData];
                    this.totalRecords = this.filteredData.length;
                    this.updatePagination();
                    this.updateDisplayedData();

                    this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.DELETE'));
                    this.spinner.hide();
                }, 500);
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

    trackByFn(index: number, item: Kecamatan): number {
        return item.id;
    }
}
