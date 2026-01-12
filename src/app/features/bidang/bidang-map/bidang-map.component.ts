import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Observable } from 'rxjs';
import { RestApiService } from '../../../services/rest-api.service';
import { BprdApiService, KecamatanBoundary, BlokBoundary, BidangBoundary } from '../../../services/bprd-api.service';
import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { SingleVertexEditor, enableSingleVertexEdit } from '../../../shared/single-vertex-editor';

// Interface for BPRD Bidang Detail Response
interface BidangDetailResponse {
  nop: string;
  alamatOP: string;
  namaWP: string;
  npwp: string;
  statusWP: string;
  pekerjaanWP: string;
  alamatWP: string;
  luasTanah: string;
  luasBangunan: string;
  jpt: string;
  jpb: string | null;
  jumlahBangunan: string;
  kodeZNT: string;
  njopBumi: string;
  njopBangunan: string;
  njopTotal: string;
  detail: boolean;
  pbbTerhutang: string;
  pbbTahun: string;
  statusBayar: string;
  id: string;
  image: any[];
  geom: string;
}

@Component({
  selector: 'app-bidang-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bidang-map.component.html',
  styleUrls: ['./bidang-map.component.scss']
})
export class BidangMapComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;
  private map: L.Map | null = null;
  private geoJsonLayer: L.GeoJSON | null = null;

  // Data properties
  geoJsonData: any[] = [];
  currentPage = 0;
  pageSize = 10000;
  totalElements = 0;
  totalPages = 0;
  hasNext = false;
  hasPrev = false;
  isLoading = false;
  errorMessage = '';

  // Dropdown data
  kecamatanList: any[] = [];
  kelurahanList: any[] = [];
  selectedKecamatan: any = null;
  selectedKelurahan: any = null;
  isLoadingKecamatan = false;
  isLoadingKelurahan = false;
  isLoadingBidang = false;

  // Total count
  totalBidangCount = 0;
  isLoadingTotalCount = false;

  // Drawn layers (to be removed on cancel)
  drawnLayers: L.Layer[] = [];

  // Boundary data - List layers (children for navigation)
  kecamatanBoundariesLayer: L.GeoJSON | null = null;  // All kecamatan (like legacy layerDati)
  kelurahanBoundariesLayer: L.GeoJSON | null = null;  // Kelurahan in selected kecamatan (like legacy layerListKelurahan)
  blokBoundariesLayer: L.GeoJSON | null = null;       // Blok in selected kelurahan (like legacy layerListBlok)
  bidangBoundariesLayer: L.GeoJSON | null = null;     // Bidang in selected blok (like legacy layerListBidang)

  // Selected parent layers - Single polygon for editing (like legacy layerKecamatan, layerKelurahan, layerBlok)
  selectedKecamatanLayer: L.GeoJSON | null = null;    // Single selected kecamatan (grey, for editing)
  selectedKelurahanLayer: L.GeoJSON | null = null;    // Single selected kelurahan (grey, for editing)
  selectedBlokLayer: L.GeoJSON | null = null;         // Single selected blok (grey, for editing)

  // Cached boundary data for single-polygon editing
  bprdKecamatanData: KecamatanBoundary[] = [];
  bprdKelurahanData: any[] = [];   // Cache kelurahan data for editing
  bprdBlokData: any[] = [];        // Cache blok data for editing

  selectedKecamatanForDrilldown: any = null; // Track selected kecamatan for drill-down
  selectedKelurahanForDrilldown: any = null; // Track selected kelurahan for drill-down
  selectedBlokForDrilldown: any = null; // Track selected blok for drill-down
  showKecamatanLabels = true; // Control visibility of kecamatan labels

  // Navigation properties
  currentLevel: 'kecamatan' | 'kelurahan' | 'blok' | 'bidang' = 'kecamatan';
  navigationStack: any[] = [];

  // Objek Pajak data
  objekPajakData: any[] = [];
  selectedObjekPajak: any = null;
  isLoadingObjekPajak = false;
  showObjekPajakModal = false;

  // Bidang Detail Modal data
  selectedBidangDetail: BidangDetailResponse | null = null;
  isLoadingBidangDetail = false;
  showBidangModal = false;

  // Tematik properties
  showTematikSection = false;
  showTematikModal = false;
  selectedTematikType: string = '';
  selectedTematikKecamatan: string = '';
  selectedTematikKelurahan: string = '';
  selectedTematikTahun: string = '2025';
  isLoadingTematik = false;
  tematikLayers: any = {};
  tematikLayersArray: any[] = [];
  tematikLayer: L.GeoJSON | null = null;

  // Layer Legend Control properties
  showLayerLegend = false;
  selectedBaseLayer = 'satellite';
  baseLayers: { [key: string]: L.TileLayer } = {};
  currentBaseLayer: L.TileLayer | null = null;

  layerVisibility = {
    batasKecamatan: true,
    batasKelurahan: true,
    batasBlok: true,
    bidang: true
  };

  layerOpacity = {
    batasKecamatan: 0.7,
    batasKelurahan: 0.7,
    batasBlok: 0.7,
    bidang: 0.7,
    satellite: 1
  };

  // ==========================================
  // Geometry Editing Properties
  // ==========================================
  editMode: 'none' | 'draw' | 'edit' | 'delete' | 'move' = 'none';
  editTarget: 'kecamatan' | 'kelurahan' | 'blok' | 'bidang' | null = null; // Which layer is being edited
  editableLayer: L.FeatureGroup | null = null;
  drawControl: any = null; // Legacy (now using Geoman instead)
  pendingChanges: { id: string; geom: any; target?: string }[] = [];
  isEditToolbarVisible = false;
  selectedEditFeature: any = null;

  constructor(
    private restApiService: RestApiService,
    private bprdApiService: BprdApiService
  ) {
    // Expose methods to global window for popup buttons
    (window as any).closeKelurahanView = () => {
      this.clearKelurahanView();
    };
    (window as any).clearBlokView = () => {
      this.clearBlokView();
    };
    (window as any).clearBidangView = () => {
      this.clearBidangView();
    };
  }

  ngOnInit(): void {
    // Load total count and kecamatan data on init
    this.loadTotalBidangCount();
    this.loadKecamatanData();
  }

  ngAfterViewInit(): void {
    // Wait for DOM to be ready
    setTimeout(() => {
      this.initMap();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.map) {
      // Remove bidang boundaries layer
      if (this.bidangBoundariesLayer) {
        this.map.removeLayer(this.bidangBoundariesLayer);
        this.bidangBoundariesLayer = null;
      }
      // Remove blok boundaries layer
      if (this.blokBoundariesLayer) {
        this.map.removeLayer(this.blokBoundariesLayer);
        this.blokBoundariesLayer = null;
      }
      // Remove kelurahan boundaries layer
      if (this.kelurahanBoundariesLayer) {
        this.map.removeLayer(this.kelurahanBoundariesLayer);
        this.kelurahanBoundariesLayer = null;
      }
      // Remove kecamatan boundaries layer
      if (this.kecamatanBoundariesLayer) {
        this.map.removeLayer(this.kecamatanBoundariesLayer);
        this.kecamatanBoundariesLayer = null;
      }
      // Remove tematik layer
      if (this.tematikLayer) {
        this.map.removeLayer(this.tematikLayer);
        this.tematikLayer = null;
      }
      // Remove geoJson layer
      if (this.geoJsonLayer) {
        this.map.removeLayer(this.geoJsonLayer);
        this.geoJsonLayer = null;
      }
      // Remove map
      this.map.remove();
    }
  }

  private initMap(): void {
    if (this.mapContainer && !this.map) {
      try {
        // Basic Leaflet map initialization - Center di Lumajang
        this.map = L.map(this.mapContainer.nativeElement, {
          center: [-8.1335, 113.2246], // Koordinat Lumajang
          zoom: 11,
          doubleClickZoom: false // Disable double-click zoom to allow click navigation
        });

        // Define base layers and store references for custom layer control
        this.baseLayers = {
          'satellite': L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '© Google Maps'
          }),
          'streets': L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
            attribution: '© Google Maps'
          }),
          'osm': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
          })
        };

        // Add default layer (Google Satellite)
        this.currentBaseLayer = this.baseLayers['satellite'];
        this.currentBaseLayer.addTo(this.map);
        this.selectedBaseLayer = 'satellite';

        // Load kecamatan boundaries from BPRD API
        this.loadBprdKecamatanBoundaries();

        console.log('Map initialized successfully');
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }
  }

  refreshMap(): void {
    if (this.map) {
      this.map.invalidateSize();
    }
  }

  forceMapResize(): void {
    if (this.map) {
      this.map.invalidateSize();
      setTimeout(() => {
        this.map?.invalidateSize();
      }, 100);
    }
  }

  /**
   * Load total bidang count
   */
  loadTotalBidangCount(): void {
    this.isLoadingTotalCount = true;
    this.restApiService.getTotalBidangCount().subscribe({
      next: (count) => {
        console.log('Total bidang count:', count);
        this.totalBidangCount = count;
        this.isLoadingTotalCount = false;
      },
      error: (error) => {
        console.error('Error loading total bidang count:', error);
        this.isLoadingTotalCount = false;
      }
    });
  }

  /**
   * Load kecamatan data from API with count
   */
  loadKecamatanData(): void {
    this.isLoadingKecamatan = true;
    // Use hardcoded values for now - in real app, these should come from user selection or config
    const kdProp = '35'; // Jawa Timur
    const kdDati2 = '08'; // Lumajang (kode kabupaten Lumajang di Jawa Timur)

    this.restApiService.getKecamatanWithCount(kdProp, kdDati2).subscribe({
      next: (response) => {
        console.log('Kecamatan with count response:', response);
        this.kecamatanList = response;
        this.isLoadingKecamatan = false;
        console.log('Kecamatan list loaded:', this.kecamatanList.length, 'items');

        // If kecamatan boundaries layer exists and we're at kecamatan level,
        // refresh it to show the bidang counts
        if (this.kecamatanBoundariesLayer && this.currentLevel === 'kecamatan') {
          console.log('🔄 Refreshing kecamatan layer with bidang counts...');
          this.recreateKecamatanLayerFromCache();
        }
      },
      error: (error) => {
        console.error('Error loading kecamatan data:', error);
        this.isLoadingKecamatan = false;
      }
    });
  }

  /**
   * Load kelurahan data based on selected kecamatan with count
   */
  loadKelurahanData(): void {
    if (!this.selectedKecamatan) {
      this.kelurahanList = [];
      return;
    }

    this.isLoadingKelurahan = true;
    this.restApiService.getKelurahanWithCount(
      this.selectedKecamatan.kdPropinsi,
      this.selectedKecamatan.kdDati2,
      this.selectedKecamatan.kdKecamatan
    ).subscribe({
      next: (response) => {
        console.log('Kelurahan with count response:', response);
        this.kelurahanList = response;
        this.isLoadingKelurahan = false;
        // Reset selected kelurahan when kecamatan changes
        this.selectedKelurahan = null;
        console.log('Kelurahan list loaded:', this.kelurahanList.length, 'items');
      },
      error: (error) => {
        console.error('Error loading kelurahan data:', error);
        this.isLoadingKelurahan = false;
      }
    });
  }

  /**
   * Load bidang data based on selected kecamatan and kelurahan
   */
  loadBidangData(): void {
    if (!this.selectedKecamatan) {
      this.errorMessage = 'Please select a kecamatan first.';
      return;
    }

    this.isLoadingBidang = true;
    this.errorMessage = '';

    let apiCall;
    if (this.selectedKelurahan) {
      // Load by kelurahan
      apiCall = this.restApiService.getBidangByKelurahanGeometry(
        this.selectedKecamatan.kdPropinsi,
        this.selectedKecamatan.kdDati2,
        this.selectedKecamatan.kdKecamatan,
        this.selectedKelurahan.kdKelurahan,
        this.currentPage,
        this.pageSize
      );
    } else {
      // Load by kecamatan only
      apiCall = this.restApiService.getBidangByKecamatanGeometry(
        this.selectedKecamatan.kdPropinsi,
        this.selectedKecamatan.kdDati2,
        this.selectedKecamatan.kdKecamatan,
        this.currentPage,
        this.pageSize
      );
    }

    apiCall.subscribe({
      next: (response) => {
        // Convert backend data to GeoJSON features
        this.geoJsonData = response.data.map((item: any) => ({
          type: 'Feature',
          properties: {
            id: item.id,
            nop: item.nop,
            kd_prop: item.kd_prop,
            kd_dati2: item.kd_dati2,
            kd_kec: item.kd_kec,
            kd_kel: item.kd_kel,
            kd_blok: item.kd_blok,
            no_urut: item.no_urut,
            kd_jns_op: item.kd_jns_op,
            created_at: item.created_at,
            is_active: item.is_active
          },
          geometry: JSON.parse(item.geojson)
        }));

        this.totalElements = response.pagination.totalElements;
        this.totalPages = response.pagination.totalPages;
        this.hasNext = response.pagination.hasNext;
        this.hasPrev = response.pagination.hasPrev;
        this.isLoadingBidang = false;

        // Add GeoJSON to map
        this.addGeoJsonToMap();
      },
      error: (error) => {
        console.error('Error loading bidang data:', error);
        this.errorMessage = 'Failed to load data. Please try again.';
        this.isLoadingBidang = false;
      }
    });
  }

  /**
   * Add GeoJSON data to map
   */
  private addGeoJsonToMap(): void {
    if (!this.map || this.geoJsonData.length === 0) return;

    // Remove existing layer if any
    if (this.geoJsonLayer) {
      this.map.removeLayer(this.geoJsonLayer);
    }

    // Create GeoJSON layer
    this.geoJsonLayer = L.geoJSON(this.geoJsonData as any, {
      style: (feature) => ({
        color: '#3388ff',
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.3,
        fillColor: '#3388ff'
      }),
      onEachFeature: (feature, layer) => {
        const props = feature.properties;

        // Add click handler to fetch objek pajak data and show modal directly
        layer.on('click', (e) => {
          // Load and show data directly
          this.loadObjekPajakData(
            props.kd_prop,
            props.kd_dati2,
            props.kd_kec,
            props.kd_kel,
            props.kd_blok,
            props.no_urut,
            props.kd_jns_op
          );

          // Show modal immediately
          this.showObjekPajakModal = true;
        });
      }
    });

    // Add layer to map
    this.geoJsonLayer.addTo(this.map);

    // Ensure bidang layer is always on top of boundary layer
    this.geoJsonLayer.bringToFront();

    // Note: Don't auto-fit to bidang data to preserve boundary focus
    // User can manually zoom to see bidang details
    console.log(`✅ Added ${this.geoJsonData.length} bidang polygons to map (no auto-fit)`)
  }

  /**
   * Load next page
   */
  loadNextPage(): void {
    if (this.hasNext) {
      this.currentPage++;
      this.loadBidangData();
    }
  }

  /**
   * Load previous page
   */
  loadPrevPage(): void {
    if (this.hasPrev) {
      this.currentPage--;
      this.loadBidangData();
    }
  }

  /**
   * Refresh data
   */
  refreshData(): void {
    this.currentPage = 0;
    this.loadBidangData();
  }

  /**
   * Handle kecamatan selection change
   */
  onKecamatanChange(): void {
    this.selectedKelurahan = null;
    this.kelurahanList = [];
    this.geoJsonData = [];
    this.clearMap();

    if (this.selectedKecamatan) {
      this.loadKelurahanData();
      // Remove all kecamatan boundaries when a specific kecamatan is selected
      if (this.kecamatanBoundariesLayer && this.map) {
        this.map.removeLayer(this.kecamatanBoundariesLayer);
        this.kecamatanBoundariesLayer = null;
      }
      // Note: Kecamatan boundaries are already loaded from BPRD API
      // No need to reload individual kecamatan boundary
    } else {
      // Reset - show all kecamatan boundaries from cached data (no API call)
      if (!this.kecamatanBoundariesLayer && this.bprdKecamatanData && this.bprdKecamatanData.length > 0) {
        this.recreateKecamatanLayerFromCache();
      }
    }
  }

  /**
   * Handle kelurahan selection change
   */
  onKelurahanChange(): void {
    this.geoJsonData = [];
    this.clearMap();

    if (this.selectedKelurahan) {
      this.currentPage = 0;
      this.loadBidangData();
      // Note: Kelurahan boundaries loaded via double-click drill-down
      // from BPRD API, not from shapefile
    }
  }

  /**
   * Clear map data
   */
  clearMap(): void {
    // Clear bidang layer only, keep boundary
    if (this.map && this.geoJsonLayer) {
      this.map.removeLayer(this.geoJsonLayer);
      this.geoJsonLayer = null;
    }

    // Kecamatan boundaries are managed separately via BPRD API
  }

  /**
   * Load bidang data for selected kecamatan (without kelurahan)
   */
  loadBidangByKecamatan(): void {
    if (this.selectedKecamatan) {
      this.currentPage = 0;
      this.loadBidangData();
    }
  }

  /**
   * Get pagination info text
   */
  getPaginationInfo(): string {
    const start = (this.currentPage * this.pageSize) + 1;
    const end = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
    return `Showing ${start}-${end} of ${this.totalElements} records`;
  }

  /**
   * Load objek pajak data based on bidang click
   */
  loadObjekPajakData(kdProp: string, kdDati2: string, kdKec: string, kdKel: string, kdBlok: string, noUrut: string, kdJnsOp: string): void {
    this.isLoadingObjekPajak = true;
    this.objekPajakData = [];

    console.log('Loading objek pajak data for:', { kdProp, kdDati2, kdKec, kdKel, kdBlok, noUrut, kdJnsOp });

    // Call the specific endpoint with kdBlok and kdJnsOp
    this.restApiService.getDatObjekPajakById(kdProp, kdDati2, kdKec, kdKel, kdBlok, noUrut, kdJnsOp).subscribe({
      next: (response: any) => {
        console.log('Objek pajak response:', response);
        // For single item response, wrap in array and include subjek pajak
        if (response.objekPajak) {
          const objekPajakWithSubjek = {
            ...response.objekPajak,
            subjekPajak: response.subjekPajak || null
          };
          this.objekPajakData = [objekPajakWithSubjek];
        } else {
          this.objekPajakData = [];
        }
        this.isLoadingObjekPajak = false;
        console.log('Objek pajak data set:', this.objekPajakData);
        console.log('Data length:', this.objekPajakData.length);
      },
      error: (error: any) => {
        console.error('Error loading objek pajak data:', error);
        this.isLoadingObjekPajak = false;
        this.errorMessage = 'Failed to load objek pajak data. Please try again.';
      }
    });
  }

  /**
   * Close objek pajak modal
   */
  closeObjekPajakModal(): void {
    this.showObjekPajakModal = false;
    this.objekPajakData = [];
    this.selectedObjekPajak = null;
  }

  /**
   * Select objek pajak item
   */
  selectObjekPajak(objekPajak: any): void {
    this.selectedObjekPajak = objekPajak;
  }

  /**
   * Format currency display
   */
  formatCurrency(value: number): string {
    if (value == null) return 'N/A';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  }

  /**
   * Load kecamatan boundaries from BPRD external API
   * This replaces the old shapefile-based boundaries
   */
  private loadBprdKecamatanBoundaries(): void {
    if (!this.map) {
      console.warn('Map not ready yet, cannot load BPRD kecamatan boundaries');
      return;
    }

    console.log('🌐 Loading kecamatan boundaries from BPRD API...');

    this.bprdApiService.ensureAuthAndGetBoundaries().subscribe({
      next: (boundaries: KecamatanBoundary[]) => {
        console.log('📡 Received BPRD boundaries data:', boundaries);
        console.log('Sample boundary data:', boundaries[0]);

        if (boundaries && boundaries.length > 0) {
          console.log(`✅ Found ${boundaries.length} kecamatan boundaries from BPRD`);

          this.bprdKecamatanData = boundaries;

          // Create kecamatan boundaries layer
          this.kecamatanBoundariesLayer = L.geoJSON([], {
            style: (feature) => {
              // Get color from BPRD data or generate one
              const props = feature?.properties || {};
              const color = props.color || this.generateColorForKecamatan(props.nama || '');

              // Convert color format and ensure visibility
              let finalColor = '#FF6B35'; // Default bright color
              if (color && color.includes('rgba')) {
                finalColor = color;
              } else if (color && color.includes('RGBA')) {
                finalColor = color.replace('RGBA(', 'rgba(').toLowerCase();
              }

              return {
                color: finalColor,
                weight: 3,
                opacity: 1,
                fillColor: finalColor,
                fillOpacity: 0.4,
                dashArray: '5, 5'
              };
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const kecamatanName = props.nama || props.nmKecamatan || 'N/A';
              const kdKec = props.kd_kec;

              // Find matching kecamatan data to get jumlah bidang
              let jumlahBidang = 0;
              if (kdKec && this.kecamatanList.length > 0) {
                const matchingKecamatan = this.kecamatanList.find(k => k.kdKecamatan === kdKec);
                if (matchingKecamatan) {
                  jumlahBidang = matchingKecamatan.jumlahBidang || 0;
                }
              }

              // Add permanent label (tooltip) in the center of polygon if enabled
              if (this.showKecamatanLabels) {
                // Create multi-line label with kecamatan name and bidang count
                const labelHtml = `
                  <div style="text-align: center;">
                    <div style="font-weight: bold; margin-bottom: 2px;">${kecamatanName}</div>
                    <div style="font-size: 10px; opacity: 0.9;">${jumlahBidang.toLocaleString('id-ID')} Bidang</div>
                  </div>
                `;

                layer.bindTooltip(labelHtml, {
                  permanent: true,
                  direction: 'center',
                  className: 'kecamatan-label',
                  opacity: 0.9
                });
              }

              // Add hover effect
              layer.on({
                mouseover: (e) => {
                  const targetLayer = e.target;
                  targetLayer.setStyle({
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.5
                  });
                },
                mouseout: (e) => {
                  if (this.kecamatanBoundariesLayer) {
                    this.kecamatanBoundariesLayer.resetStyle(e.target);
                  }
                },
                dblclick: (e) => {
                  // Double-click: Load kelurahan boundaries (drill-down)
                  L.DomEvent.stopPropagation(e); // Prevent map zoom

                  const kdKec = props.kd_kec;
                  const kecamatanName = props.nama;

                  console.log(`🔍 Clicked kecamatan: ${kecamatanName} (${kdKec})`);
                  console.log('📍 Loading kelurahan boundaries with count...');

                  // Load kelurahan boundaries with count for this kecamatan
                  this.loadKelurahanBoundariesWithCount(kdKec, kecamatanName, e.target);
                }
              });
            }
          });

          // Process each boundary data and add to layer
          let processedCount = 0;
          boundaries
            .filter(boundary => boundary.is_active)
            .forEach((boundary, index) => {
              try {
                console.log(`🔄 Processing boundary ${index + 1}/${boundaries.length}:`, boundary.nama);

                // Convert geom to GeoJSON feature
                const geoJsonFeature = this.convertBprdGeomToGeoJSON(boundary);
                if (geoJsonFeature && geoJsonFeature.geometry) {
                  console.log(`✅ Successfully converted ${boundary.nama}:`, geoJsonFeature);
                  this.kecamatanBoundariesLayer?.addData(geoJsonFeature);
                  processedCount++;
                } else {
                  console.warn(`⚠️ Empty geometry for ${boundary.nama}`);
                }
              } catch (error) {
                console.error(`❌ Failed to process boundary for ${boundary.nama}:`, error);
              }
            });

          console.log(`📊 Processing complete: ${processedCount}/${boundaries.length} boundaries added`);

          if (this.map && this.kecamatanBoundariesLayer && processedCount > 0) {
            // Add kecamatan boundaries layer to map
            this.kecamatanBoundariesLayer.addTo(this.map);
            console.log('✅ BPRD Kecamatan boundaries layer added to map');

            // Set fixed view for Lumajang instead of fitBounds to avoid zoom issues
            setTimeout(() => {
              try {
                // Use fixed Lumajang coordinates - more reliable than fitBounds
                console.log('🎯 Setting fixed view for Lumajang Kabupaten');
                this.map?.setView([-8.1335, 113.2246], 10); // Lumajang center with good zoom level
              } catch (error) {
                console.warn('Could not set view, using fallback');
                this.map?.setView([-8.1335, 113.2246], 10);
              }
            }, 300);
          }

          console.log(`✅ Successfully loaded ${boundaries.length} BPRD kecamatan boundaries`);
        } else {
          console.warn('No BPRD boundary data received');
        }
      },
      error: (error) => {
        console.error('❌ Error loading BPRD boundaries:', error);
        alert('Gagal memuat boundaries kecamatan dari BPRD API');
      }
    });
  }

  /**
   * Convert BPRD boundary data to GeoJSON feature
   * Backend already converts WKB to GeoJSON, so we just need to create Feature object
   * Handles kecamatan, kelurahan, and blok boundaries
   */
  private convertBprdGeomToGeoJSON(boundary: any): any {
    try {
      console.log('🔄 Converting BPRD boundary for:', boundary.nama || boundary.kd_blok);

      // Backend already provides geojson field with proper GeoJSON geometry
      if (boundary.geojson && typeof boundary.geojson === 'object') {
        const geom = boundary.geojson as any;

        // Validate that it's a proper GeoJSON geometry
        if (geom.type && geom.coordinates) {
          console.log(`✅ Valid GeoJSON for ${boundary.nama || boundary.kd_blok}: type=${geom.type}`);

          // Build properties - include all relevant fields
          const properties: any = {
            id: boundary.id,
            is_active: boundary.is_active
          };

          // Add kd_kec (common to all)
          if (boundary.kd_kec) properties.kd_kec = boundary.kd_kec;

          // Add kd_kel (for kelurahan and blok)
          if (boundary.kd_kel) properties.kd_kel = boundary.kd_kel;

          // Add kd_blok (for blok only)
          if (boundary.kd_blok) properties.kd_blok = boundary.kd_blok;

          // Add nama (for kecamatan and kelurahan)
          if (boundary.nama) properties.nama = boundary.nama;

          // Add color (for kecamatan)
          if (boundary.color) properties.color = boundary.color;

          // Add bidang-specific properties
          if (boundary.no_urut) properties.no_urut = boundary.no_urut;
          if (boundary.kd_jns_op) properties.kd_jns_op = boundary.kd_jns_op;
          if (boundary.nop) properties.nop = boundary.nop;
          if (boundary.kd_prop) properties.kd_prop = boundary.kd_prop;
          if (boundary.kd_dati2) properties.kd_dati2 = boundary.kd_dati2;

          return {
            type: 'Feature',
            properties: properties,
            geometry: geom
          };
        } else {
          console.warn(`⚠️ Invalid GeoJSON structure for ${boundary.nama || boundary.kd_blok}:`, geom);
        }
      } else {
        console.warn(`⚠️ No geojson field for ${boundary.nama || boundary.kd_blok}`);
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to convert geometry:`, error);
      return null;
    }
  }

  /**
   * Generate color for kecamatan if not provided
   */
  private generateColorForKecamatan(name: string): string {
    const colors = [
      'RGBA(76, 175, 80, 0.5)',   // Green
      'RGBA(33, 150, 243, 0.5)',  // Blue
      'RGBA(255, 152, 0, 0.5)',   // Orange
      'RGBA(156, 39, 176, 0.5)',  // Purple
      'RGBA(233, 30, 99, 0.5)',   // Pink
      'RGBA(0, 188, 212, 0.5)',   // Cyan
      'RGBA(255, 235, 59, 0.5)',  // Yellow
      'RGBA(121, 85, 72, 0.5)',   // Brown
      'RGBA(96, 125, 139, 0.5)',  // Blue Grey
      'RGBA(63, 81, 181, 0.5)'    // Indigo
    ];

    // Generate consistent color based on name hash
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Toggle kecamatan labels visibility
   */
  toggleKecamatanLabels(): void {
    this.showKecamatanLabels = !this.showKecamatanLabels;

    if (this.kecamatanBoundariesLayer) {
      // Remove and re-add the layer to refresh tooltips (no API call)
      if (this.map) {
        this.map.removeLayer(this.kecamatanBoundariesLayer);
        this.kecamatanBoundariesLayer = null;

        // Re-create the layer with or without labels from cache
        this.recreateKecamatanLayerFromCache();
      }
    }

    console.log(`🏷️ Kecamatan labels ${this.showKecamatanLabels ? 'shown' : 'hidden'}`);
  }

  /**
   * Load kelurahan boundaries for a specific kecamatan (drill-down)
   */
  private loadKelurahanBoundaries(kdKec: string, kecamatanName: string, kecamatanLayer?: any): void {
    if (!this.map) {
      console.warn('Map not ready');
      return;
    }

    console.log(`🏘️ Loading kelurahan boundaries for ${kecamatanName} (${kdKec})`);

    this.bprdApiService.getKelurahanBoundariesViaBackend(kdKec).subscribe({
      next: (kelurahanBoundaries) => {
        console.log(`📡 Received ${kelurahanBoundaries.length} kelurahan boundaries`);

        // Cache kelurahan data for single-polygon edit mode
        this.bprdKelurahanData = kelurahanBoundaries;

        if (kelurahanBoundaries && kelurahanBoundaries.length > 0) {
          // Remove existing kelurahan layer if any
          if (this.kelurahanBoundariesLayer && this.map) {
            this.map.removeLayer(this.kelurahanBoundariesLayer);
            this.kelurahanBoundariesLayer = null;
          }

          // Store selected kecamatan and update navigation
          this.selectedKecamatanForDrilldown = {
            kdKec,
            nama: kecamatanName
          };
          this.currentLevel = 'kelurahan';
          this.navigationStack = [{ level: 'kecamatan', name: 'Semua Kecamatan' }];

          // Hide kecamatan labels temporarily
          const wasShowingLabels = this.showKecamatanLabels;
          if (wasShowingLabels) {
            this.showKecamatanLabels = false;
            // Refresh kecamatan layer without labels (no API call)
            if (this.kecamatanBoundariesLayer && this.map) {
              this.map.removeLayer(this.kecamatanBoundariesLayer);
              this.kecamatanBoundariesLayer = null;
              this.recreateKecamatanLayerFromCache();
            }
          }

          // Create kelurahan boundaries layer
          this.kelurahanBoundariesLayer = L.geoJSON([], {
            style: (feature) => {
              return {
                color: '#16a34a', // Green color for kelurahan
                weight: 2,
                opacity: 1,
                fillColor: '#86efac',
                fillOpacity: 0.3
              };
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const kelurahanName = props.nama || 'N/A';
              const kdKel = props.kd_kel || 'N/A';

              // Add label for kelurahan
              layer.bindTooltip(kelurahanName, {
                permanent: true,
                direction: 'center',
                className: 'kelurahan-label',
                opacity: 0.9
              });



              // Hover effects and click handler
              layer.on({
                mouseover: (e) => {
                  const targetLayer = e.target;
                  targetLayer.setStyle({
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.5
                  });
                },
                mouseout: (e) => {
                  if (this.kelurahanBoundariesLayer) {
                    this.kelurahanBoundariesLayer.resetStyle(e.target);
                  }
                },
                dblclick: (e) => {
                  // Double-click kelurahan: Load blok boundaries
                  L.DomEvent.stopPropagation(e); // Prevent map zoom

                  const kdKec = props.kd_kec;
                  const kdKel = props.kd_kel;
                  const kelurahanName = props.nama;

                  console.log(`🏗️ Clicked kelurahan: ${kelurahanName} (${kdKec}/${kdKel})`);
                  console.log('🏗️ Loading blok boundaries...');

                  // Load blok boundaries for this kelurahan
                  this.loadBlokBoundaries(kdKec, kdKel, kelurahanName, e.target);
                }
              });
            }
          });

          // Convert and add kelurahan boundaries
          let processedCount = 0;
          kelurahanBoundaries
            .filter(boundary => boundary.is_active)
            .forEach((boundary, index) => {
              try {
                // Convert geom (WKB hex) to GeoJSON
                const geoJsonFeature = this.convertBprdGeomToGeoJSON(boundary as any);
                if (geoJsonFeature && geoJsonFeature.geometry) {
                  this.kelurahanBoundariesLayer?.addData(geoJsonFeature);
                  processedCount++;
                } else {
                  console.warn(`⚠️ Empty geometry for kelurahan ${boundary.nama}`);
                }
              } catch (error) {
                console.error(`❌ Failed to process kelurahan ${boundary.nama}:`, error);
              }
            });

          console.log(`📊 Processed ${processedCount}/${kelurahanBoundaries.length} kelurahan boundaries`);

          if (this.map && this.kelurahanBoundariesLayer && processedCount > 0) {
            // Add to map
            this.kelurahanBoundariesLayer.addTo(this.map);

            console.log(`✅ Kelurahan boundaries displayed for ${kecamatanName}`);

            // Dim the kecamatan layer
            if (kecamatanLayer) {
              kecamatanLayer.setStyle({
                opacity: 0.3,
                fillOpacity: 0.1
              });
            }
          }
        } else {
          console.warn(`⚠️ No kelurahan boundaries found for ${kecamatanName}`);
          alert(`Tidak ada data kelurahan untuk ${kecamatanName}`);
        }
      },
      error: (error) => {
        console.error('❌ Error loading kelurahan boundaries:', error);
        alert(`Gagal memuat data kelurahan: ${error.message}`);
      }
    });
  }

  /**
   * Clear kelurahan drill-down and return to kecamatan view
   */
  clearKelurahanView(): void {
    // Clear kelurahan layer
    if (this.kelurahanBoundariesLayer && this.map) {
      this.map.removeLayer(this.kelurahanBoundariesLayer);
      this.kelurahanBoundariesLayer = null;
    }

    // Step 3: Clear selectedKecamatanLayer (the single grey kecamatan polygon)
    if (this.selectedKecamatanLayer && this.map) {
      this.map.removeLayer(this.selectedKecamatanLayer);
      this.selectedKecamatanLayer = null;
      console.log('🗑️ Cleared selectedKecamatanLayer');
    }

    // Reset navigation state
    this.selectedKecamatanForDrilldown = null;
    this.currentLevel = 'kecamatan';
    this.navigationStack = [];

    // Restore kecamatan labels and layer
    this.showKecamatanLabels = true;
    this.recreateKecamatanLayerFromCache();

    // Set fixed view for Lumajang (more reliable than fitBounds which can give wrong bounds)
    if (this.map) {
      this.map.setView([-8.1335, 113.2246], 11);
      console.log('🔍 Set view to Lumajang center (zoom 11)');
    }

    console.log('🔙 Returned to kecamatan view');
  }

  /**
   * Load kelurahan boundaries with bidang count for a specific kecamatan (using 2 separate endpoints)
   */
  loadKelurahanBoundariesWithCount(kdKec: string, kecamatanName: string, kecamatanLayer?: any): void {
    if (!this.map) {
      console.warn('Map not ready');
      return;
    }

    console.log(`🏘️📊 Loading kelurahan boundaries with count for ${kecamatanName} (${kdKec})`);

    // Try to sync selectedKecamatan with clicked kecamatan for consistent parameters
    const matchingKecamatan = this.kecamatanList?.find(kec => kec.kdKecamatan === kdKec);
    if (matchingKecamatan && !this.selectedKecamatan) {
      console.log(`🔄 Auto-selecting kecamatan for consistent parameters:`, matchingKecamatan);
      this.selectedKecamatan = matchingKecamatan;
    }

    // Get propinsi and dati2 from clicked kecamatan properties or selected kecamatan
    let kdProp, kdDati2, kdKecParam;

    if (this.selectedKecamatan) {
      // Use selectedKecamatan from dropdown (most reliable)
      kdProp = this.selectedKecamatan.kdPropinsi;
      kdDati2 = this.selectedKecamatan.kdDati2;
      kdKecParam = this.selectedKecamatan.kdKecamatan;
      console.log(`🎯 Using selectedKecamatan parameters`);
    } else {
      // Try to find matching kecamatan in dropdown data
      const matchingKec = this.kecamatanList?.find(kec =>
        kec.kdKecamatan === kdKec ||
        kec.kdKecamatan === kdKec.padStart(3, '0') ||
        kec.kdKecamatan.slice(-3) === kdKec
      );

      if (matchingKec) {
        kdProp = matchingKec.kdPropinsi;
        kdDati2 = matchingKec.kdDati2;
        kdKecParam = matchingKec.kdKecamatan;
        console.log(`🎯 Found matching kecamatan in dropdown:`, matchingKec);
      } else {
        // Default fallback - try common formats
        kdProp = '35';
        kdDati2 = '09';
        kdKecParam = kdKec.padStart(3, '0'); // Ensure 3-digit format
        console.log(`🎯 Using fallback parameters with padded kdKec`);
      }
    }

    console.log(`🎯 ===== DEBUG API PARAMETERS =====`);
    console.log(`🎯 kdProp: ${kdProp}`);
    console.log(`🎯 kdDati2: ${kdDati2}`);
    console.log(`🎯 kdKec from map: ${kdKec}`);
    console.log(`🎯 kdKecParam for API: ${kdKecParam}`);
    console.log(`🎯 Using parameters - kdProp: ${kdProp}, kdDati2: ${kdDati2}, kdKecParam: ${kdKecParam}`);
    console.log(`🎯 selectedKecamatan:`, this.selectedKecamatan);
    console.log(`🎯 Boundaries URL: /api/bprd/kelurahan?kd_kec=${kdKec}`);
    console.log(`🎯 Count URL: /api/bidang/kelurahan-with-count/${kdProp}/${kdDati2}/${kdKecParam}`);

    // Hit 2 endpoints in parallel: boundaries from BPRD + count from local DB
    const boundariesRequest$ = this.bprdApiService.getKelurahanBoundariesViaBackend(kdKec);
    const countRequest$ = this.restApiService.getKelurahanWithCount(kdProp, kdDati2, kdKecParam);

    // Use forkJoin to fetch both data simultaneously
    forkJoin({
      boundaries: boundariesRequest$,
      counts: countRequest$
    }).subscribe({
      next: (results) => {
        console.log(`📡 ===== DEBUG BOUNDARIES RESPONSE =====`);
        console.log(`📡 Boundaries response:`, results.boundaries);
        console.log(`📡 Boundaries type:`, typeof results.boundaries);
        console.log(`📡 Boundaries length:`, Array.isArray(results.boundaries) ? results.boundaries.length : 'Not array');

        console.log(`📊 ===== DEBUG COUNTS RESPONSE =====`);
        console.log(`📊 Counts response:`, results.counts);
        console.log(`📊 Counts type:`, typeof results.counts);
        console.log(`📊 Counts length:`, Array.isArray(results.counts) ? results.counts.length : 'Not array');

        // Debug first count record if available
        if (Array.isArray(results.counts) && results.counts.length > 0) {
          console.log(`📊 First count record:`, results.counts[0]);
          console.log(`📊 Available keys in first count:`, Object.keys(results.counts[0]));
        } const boundaries = results.boundaries;
        const countsData = results.counts;

        if (boundaries && boundaries.length > 0) {
          // Remove existing kelurahan layer if any
          if (this.kelurahanBoundariesLayer && this.map) {
            this.map.removeLayer(this.kelurahanBoundariesLayer);
            this.kelurahanBoundariesLayer = null;
          }

          // Store selected kecamatan and update navigation
          this.selectedKecamatanForDrilldown = {
            kdKec,
            nama: kecamatanName
          };
          this.currentLevel = 'kelurahan';
          this.navigationStack = [{ level: 'kecamatan', name: 'Semua Kecamatan' }];

          // Step 2: Create selectedKecamatanLayer - single polygon for this kecamatan (like legacy layerKecamatan)
          if (this.selectedKecamatanLayer && this.map) {
            this.map.removeLayer(this.selectedKecamatanLayer);
            this.selectedKecamatanLayer = null;
          }

          // Get GeoJSON from clicked kecamatan layer and create grey-styled layer
          if (kecamatanLayer && kecamatanLayer.toGeoJSON) {
            const kecamatanGeojson = kecamatanLayer.toGeoJSON();
            this.selectedKecamatanLayer = L.geoJSON(kecamatanGeojson, {
              style: {
                color: 'grey',
                weight: 2,
                fillColor: 'grey',
                fillOpacity: 0.15
              }
            });
            if (this.map) {
              this.selectedKecamatanLayer.addTo(this.map);
              console.log(`✅ Created selectedKecamatanLayer for ${kecamatanName}`);

              // Fit bounds to selected kecamatan
              const bounds = this.selectedKecamatanLayer.getBounds();
              if (bounds && bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [30, 30] });
                console.log('🔍 Fitted bounds to selected kecamatan');
              }
            }
          }

          // Hide ALL other kecamatan (remove kecamatanBoundariesLayer completely)
          if (this.kecamatanBoundariesLayer && this.map) {
            this.map.removeLayer(this.kecamatanBoundariesLayer);
            this.kecamatanBoundariesLayer = null;
            console.log('🙈 Hidden all other kecamatan');
          }
          this.showKecamatanLabels = false;

          // Create count map for easy lookup based on kd_kel
          const countMap = new Map<string, number>();
          if (countsData && Array.isArray(countsData)) {
            console.log(`📊 ===== PROCESSING COUNT DATA =====`);
            console.log(`📊 Processing ${countsData.length} count records`);
            countsData.forEach((item: any, index: number) => {
              // Debug each record structure
              if (index < 3) {
                console.log(`📊 Count record[${index}] structure:`, item);
                console.log(`📊 Available fields:`, Object.keys(item));
              }

              // Handle backend field names (camelCase from BidangController)
              const kdKel = item.kdKelurahan;  // Backend uses kdKelurahan
              const count = item.jumlahBidang || 0;  // Backend uses jumlahBidang

              if (kdKel) {
                countMap.set(kdKel, count);
                console.log(`📊 Count map[${index}]: "${kdKel}" = ${count} bidang (from field: ${item.kdKelurahan ? 'kdKelurahan' : item.kd_kelurahan ? 'kd_kelurahan' : 'kd_kel'})`);
              } else {
                console.warn(`⚠️ Count record[${index}] missing kd_kel:`, item);
              }
            });
            console.log(`📊 ===== COUNT MAP SUMMARY =====`);
            console.log(`📊 Count map created with ${countMap.size} entries`);
            console.log(`📊 Count map contents:`, Array.from(countMap.entries()));
          } else {
            console.error(`❌ Count data issue:`, {
              countsData,
              type: typeof countsData,
              isArray: Array.isArray(countsData)
            });
          }

          // Create kelurahan boundaries layer with count info (merged based on kd_kel)
          this.kelurahanBoundariesLayer = L.geoJSON([], {
            style: (feature) => {
              // Use count from merged properties (already processed based on kd_kel)
              const bidangCount = feature?.properties?.jumlah_bidang || 0;
              const kdKel = feature?.properties?.kd_kel || 'N/A';

              // Color based on bidang count (merged by kd_kel)
              let fillColor = '#fca5a5'; // Light red for 0
              if (bidangCount > 100) fillColor = '#16a34a'; // Green for high count
              else if (bidangCount > 50) fillColor = '#eab308'; // Yellow for medium count
              else if (bidangCount > 0) fillColor = '#f97316'; // Orange for low count

              // Debug first few features
              if (feature?.properties?.debug_index < 3) {
                console.log(`🎨 Style applied: kd_kel=${kdKel}, count=${bidangCount}, color=${fillColor}`);
              }

              return {
                color: '#16a34a', // Green border for kelurahan
                weight: 2,
                opacity: 1,
                fillColor: fillColor,
                fillOpacity: 0.5
              };
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const kelurahanName = props.nama || 'N/A';
              const kdKel = props.kd_kel || props.kd_kelurahan || 'N/A';
              // Get count from properties (already merged based on kd_kel)
              const bidangCount = props.jumlah_bidang || 0;

              // Enhanced label with bidang count (merged based on kd_kel)
              const labelText = `${kelurahanName}\n(${bidangCount} bidang)`;
              layer.bindTooltip(labelText, {
                permanent: true,
                direction: 'center',
                className: 'kelurahan-label-with-count',
                opacity: 0.9
              });

              // Hover effects and click handler (NO POPUP)
              layer.on({
                mouseover: (e) => {
                  const targetLayer = e.target;
                  targetLayer.setStyle({
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.7
                  });
                },
                mouseout: (e) => {
                  if (this.kelurahanBoundariesLayer) {
                    this.kelurahanBoundariesLayer.resetStyle(e.target);
                  }
                },
                dblclick: (e) => {
                  L.DomEvent.stopPropagation(e); // Double-click: drill-down to blok
                  console.log(`🏗️ Clicked kelurahan: ${kelurahanName} (${kdKel}) - Loading blok boundaries...`);
                  // Load blok boundaries for this kelurahan
                  // Need kdKec from current kecamatan context
                  const currentKdKec = this.selectedKecamatan?.kdKecamatan || '001'; // fallback
                  this.loadBlokBoundaries(currentKdKec, kdKel, kelurahanName, e.target);
                }
              });
            }
          });

          // Process and add kelurahan boundaries with count merge
          let processedCount = 0;
          console.log(`📊 ===== PROCESSING BOUNDARIES =====`);
          console.log(`📊 Processing ${boundaries.length} boundary records`);

          boundaries
            .filter((boundary: any) => boundary.is_active)
            .forEach((boundary: any, index: number) => {
              try {
                // Debug boundary structure
                if (index < 3) {
                  console.log(`📊 Boundary[${index}] structure:`, boundary);
                  console.log(`📊 Available fields:`, Object.keys(boundary));
                }

                // Convert geom (WKB hex) to GeoJSON
                const geoJsonFeature = this.convertBprdGeomToGeoJSON(boundary as any);

                if (geoJsonFeature && geoJsonFeature.geometry) {
                  // Get kd_kel for merge (handle different field names)
                  const kdKel = boundary.kd_kel || boundary.kd_kelurahan;
                  const bidangCount = countMap.get(kdKel) || 0;

                  console.log(`🔍 Boundary[${index}] merge: "${boundary.nama}" kd_kel="${kdKel}" → count=${bidangCount}`);
                  console.log(`🔍 CountMap has key "${kdKel}":`, countMap.has(kdKel));

                  // Add count info to properties - based on kd_kel merge
                  geoJsonFeature.properties = {
                    ...geoJsonFeature.properties,
                    kd_kel: kdKel, // Ensure consistent field name for merge
                    jumlah_bidang: bidangCount, // Count merged based on kd_kel
                    debug_index: index // For debugging first few records
                  };

                  this.kelurahanBoundariesLayer?.addData(geoJsonFeature);
                  processedCount++;

                  console.log(`✅ Added kelurahan[${index}]: ${boundary.nama} (kd_kel: ${kdKel}) with ${bidangCount} bidang`);
                } else {
                  console.warn(`⚠️ Empty geometry for kelurahan ${boundary.nama} (kd_kel: ${boundary.kd_kel})`);
                }
              } catch (error) {
                console.error(`❌ Failed to process kelurahan ${boundary.nama}:`, error);
              }
            });

          console.log(`📊 Processed ${processedCount}/${boundaries.length} kelurahan boundaries with count`);

          if (this.map && this.kelurahanBoundariesLayer && processedCount > 0) {
            // Add to map
            this.kelurahanBoundariesLayer.addTo(this.map);

            console.log(`✅ Kelurahan boundaries with count displayed for ${kecamatanName}`);

            // Dim the kecamatan layer
            if (kecamatanLayer) {
              kecamatanLayer.setStyle({
                opacity: 0.3,
                fillOpacity: 0.1
              });
            }

            // Add legend for bidang count colors
            this.addBidangCountLegend();
          }
        } else {
          console.warn(`⚠️ No kelurahan boundaries found for ${kecamatanName}`);
          alert(`Tidak ada data kelurahan untuk ${kecamatanName}`);
        }
      },
      error: (error) => {
        console.error('❌ ===== ERROR LOADING DATA =====');
        console.error('❌ Error loading kelurahan data:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error body:', error.error);

        let errorMsg = 'Gagal memuat data kelurahan';
        if (error.status === 0) {
          errorMsg += ': Backend tidak dapat diakses. Pastikan backend sudah running.';
        } else if (error.status === 404) {
          errorMsg += ': Endpoint tidak ditemukan.';
        } else if (error.status === 500) {
          errorMsg += ': Error di backend server.';
        } else {
          errorMsg += `: ${error.message}`;
        }

        alert(errorMsg);
      }
    });
  }

  /**
   * Add legend for bidang count colors
   */
  private addBidangCountLegend(): void {
    if (!this.map) return;

    // Remove existing legend if any
    const existingLegend = document.querySelector('.bidang-count-legend');
    if (existingLegend) {
      existingLegend.remove();
    }

    const legend = new L.Control({ position: 'bottomright' });

    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'bidang-count-legend');
      div.innerHTML = `
        <h4>Jumlah Bidang</h4>
        <div class="legend-item">
          <span class="legend-color" style="background-color: #16a34a; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span>
          <span>&gt; 100 bidang</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background-color: #eab308; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span>
          <span>51-100 bidang</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background-color: #f97316; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span>
          <span>1-50 bidang</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background-color: #fca5a5; width: 20px; height: 15px; display: inline-block; margin-right: 5px;"></span>
          <span>0 bidang</span>
        </div>
      `;
      div.style.backgroundColor = 'white';
      div.style.padding = '10px';
      div.style.border = '2px solid #ccc';
      div.style.borderRadius = '5px';
      div.style.fontSize = '12px';
      div.style.lineHeight = '18px';
      return div;
    };

    legend.addTo(this.map);
  }

  /**
   * Show kelurahan boundaries with bidang count for selected kecamatan
   */
  showKelurahanWithCount(): void {
    if (!this.selectedKecamatan) {
      alert('Silakan pilih kecamatan terlebih dahulu');
      return;
    }

    const kdKec = this.selectedKecamatan.kdKecamatan;
    const kecamatanName = this.selectedKecamatan.nmKecamatan;

    console.log(`🗺️📊 Showing kelurahan with count for ${kecamatanName} (${kdKec})`);

    this.loadKelurahanBoundariesWithCount(kdKec, kecamatanName);
  }

  /**
   * Load blok boundaries for specific kelurahan from BPRD API
   */
  private loadBlokBoundaries(kdKec: string, kdKel: string, kelurahanName: string, kelurahanLayer: any): void {
    if (!this.map) {
      console.warn('Map not ready yet');
      return;
    }

    console.log(`🏗️📊 Loading blok boundaries with count for ${kelurahanName} (${kdKec}/${kdKel})`);

    // Try to sync selectedKecamatan with clicked kecamatan for consistent parameters
    const matchingKecamatan = this.kecamatanList?.find(kec => kec.kdKecamatan === kdKec);
    if (matchingKecamatan && !this.selectedKecamatan) {
      console.log(`🔄 Auto-selecting kecamatan for consistent parameters:`, matchingKecamatan);
      this.selectedKecamatan = matchingKecamatan;
    }

    // Get propinsi and dati2 from clicked kecamatan properties or selected kecamatan
    let kdProp, kdDati2, kdKecParam, kdKelParam;

    if (this.selectedKecamatan) {
      // Use selectedKecamatan from dropdown (most reliable)
      kdProp = this.selectedKecamatan.kdPropinsi;
      kdDati2 = this.selectedKecamatan.kdDati2;
      kdKecParam = this.selectedKecamatan.kdKecamatan;
      console.log(`🎯 Using selectedKecamatan parameters`);
    } else {
      // Try to find matching kecamatan in dropdown data
      const matchingKec = this.kecamatanList?.find(kec =>
        kec.kdKecamatan === kdKec ||
        kec.kdKecamatan === kdKec.padStart(3, '0') ||
        kec.kdKecamatan.slice(-3) === kdKec
      );

      if (matchingKec) {
        kdProp = matchingKec.kdPropinsi;
        kdDati2 = matchingKec.kdDati2;
        kdKecParam = matchingKec.kdKecamatan;
        console.log(`🎯 Found matching kecamatan in dropdown:`, matchingKec);
      } else {
        // Default fallback - try common formats
        kdProp = '35';
        kdDati2 = '09';
        kdKecParam = kdKec.padStart(3, '0'); // Ensure 3-digit format
        console.log(`🎯 Using fallback parameters with padded kdKec`);
      }
    }

    // Get kdKelParam - try to find matching kelurahan
    if (this.selectedKelurahan) {
      kdKelParam = this.selectedKelurahan.kdKelurahan;
      console.log(`🎯 Using selectedKelurahan kdKel:`, kdKelParam);
    } else {
      // Try to find matching kelurahan in dropdown data
      const matchingKel = this.kelurahanList?.find(kel =>
        kel.kdKelurahan === kdKel ||
        kel.kdKelurahan === kdKel.padStart(3, '0') ||
        kel.kdKelurahan.slice(-3) === kdKel
      );

      if (matchingKel) {
        kdKelParam = matchingKel.kdKelurahan;
        console.log(`🎯 Found matching kelurahan in dropdown:`, matchingKel);
      } else {
        // Default fallback - try common formats
        kdKelParam = kdKel.padStart(3, '0'); // Ensure 3-digit format
        console.log(`🎯 Using fallback parameters with padded kdKel`);
      }
    }

    console.log(`🎯 ===== DEBUG API PARAMETERS =====`);
    console.log(`🎯 kdProp: ${kdProp}`);
    console.log(`🎯 kdDati2: ${kdDati2}`);
    console.log(`🎯 kdKec from map: ${kdKec}`);
    console.log(`🎯 kdKecParam for API: ${kdKecParam}`);
    console.log(`🎯 kdKel from map: ${kdKel}`);
    console.log(`🎯 kdKelParam for API: ${kdKelParam}`);
    console.log(`🎯 Using parameters - kdProp: ${kdProp}, kdDati2: ${kdDati2}, kdKecParam: ${kdKecParam}, kdKelParam: ${kdKelParam}`);
    console.log(`🎯 Boundaries URL: /api/bprd/blok?kd_kec=${kdKec}&kd_kel=${kdKel}`);
    console.log(`🎯 Count URL: /api/bidang/blok-with-count/${kdProp}/${kdDati2}/${kdKecParam}/${kdKelParam}`);

    // Show loading indicator
    const loadingPopup = L.popup()
      .setLatLng(kelurahanLayer.getBounds().getCenter())
      .setContent('<div style="text-align: center;"><i class="ri-loader-line spin"></i> Loading blok boundaries...</div>')
      .openOn(this.map);

    // Hit 2 endpoints in parallel: boundaries from BPRD + count from local DB
    const boundariesRequest$ = this.bprdApiService.getBlokBoundariesViaBackend(kdKec, kdKel);
    const countRequest$ = this.restApiService.getBlokWithCount(kdProp, kdDati2, kdKecParam, kdKelParam);

    // Use forkJoin to fetch both data simultaneously
    forkJoin({
      boundaries: boundariesRequest$,
      countData: countRequest$
    }).subscribe({
      next: ({ boundaries: blokBoundaries, countData: blokCountData }) => {
        // Close loading popup
        this.map?.closePopup(loadingPopup);

        console.log(`📡 Received ${blokBoundaries.length} blok boundaries for ${kelurahanName}`);
        console.log(`📊 Received blok count data:`, blokCountData);

        // Cache blok data for single-polygon edit mode
        this.bprdBlokData = blokBoundaries;

        if (blokBoundaries && blokBoundaries.length > 0) {
          // Remove existing blok layer
          if (this.blokBoundariesLayer && this.map) {
            this.map.removeLayer(this.blokBoundariesLayer);
          }

          // Create blok boundaries layer with orange/red color
          this.blokBoundariesLayer = L.geoJSON([], {
            style: (feature) => ({
              color: '#ea580c', // Orange color for blok
              weight: 2,
              opacity: 1,
              fillColor: '#ea580c',
              fillOpacity: 0.3,
              dashArray: '3, 3'
            }),
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const kdBlok = props.kd_blok || 'N/A';

              // Find count for this blok
              const blokCount = blokCountData?.find((blok: any) => blok.kdBlok === kdBlok)?.jumlahBidang || 0;

              // Add label for blok with count
              layer.bindTooltip(`${kdBlok} (${blokCount})`, {
                permanent: true,
                direction: 'center',
                className: 'blok-label',
                opacity: 0.9
              });

              // Hover effects and click handler
              layer.on({
                mouseover: (e) => {
                  const targetLayer = e.target;
                  targetLayer.setStyle({
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.5
                  });
                },
                mouseout: (e) => {
                  if (this.blokBoundariesLayer) {
                    this.blokBoundariesLayer.resetStyle(e.target);
                  }
                },
                dblclick: (e) => {
                  // Double-click blok: Load bidang boundaries (consistent with other levels)
                  L.DomEvent.stopPropagation(e); // Prevent zoom

                  const kdKec = props.kd_kec;
                  const kdKel = props.kd_kel;
                  const kdBlok = props.kd_blok;

                  console.log(`📦 Double-clicked blok: ${kdBlok} (${kdKec}/${kdKel}/${kdBlok})`);
                  console.log('📦 Loading bidang boundaries...');

                  // Load bidang boundaries for this blok
                  this.loadBidangBoundaries(kdKec, kdKel, kdBlok, e.target);
                }
              });
            }
          });

          // Convert and add blok boundaries
          let processedCount = 0;
          blokBoundaries
            .filter(boundary => boundary.is_active)
            .forEach((boundary, index) => {
              try {
                // Convert geom (WKB hex) to GeoJSON
                const geoJsonFeature = this.convertBprdGeomToGeoJSON(boundary as any);
                if (geoJsonFeature && geoJsonFeature.geometry) {
                  this.blokBoundariesLayer?.addData(geoJsonFeature);
                  processedCount++;
                } else {
                  console.warn(`⚠️ Empty geometry for blok ${boundary.kd_blok}`);
                }
              } catch (error) {
                console.error(`❌ Failed to process blok ${boundary.kd_blok}:`, error);
              }
            });

          console.log(`📊 Processed ${processedCount}/${blokBoundaries.length} blok boundaries`);

          if (this.map && this.blokBoundariesLayer && processedCount > 0) {
            // Update navigation state
            this.selectedKelurahanForDrilldown = {
              kdKec,
              kdKel,
              nama: kelurahanName
            };
            this.currentLevel = 'blok';
            this.navigationStack = [
              { level: 'kecamatan', name: 'Semua Kecamatan' },
              { level: 'kelurahan', name: this.selectedKecamatanForDrilldown?.nama || 'Kecamatan' }
            ];

            // Step 4: Create selectedKelurahanLayer - single polygon for this kelurahan (like legacy layerKelurahan)
            if (this.selectedKelurahanLayer && this.map) {
              this.map.removeLayer(this.selectedKelurahanLayer);
              this.selectedKelurahanLayer = null;
            }

            // Create grey-styled layer from clicked kelurahan
            if (kelurahanLayer && kelurahanLayer.toGeoJSON) {
              const kelurahanGeojson = kelurahanLayer.toGeoJSON();
              this.selectedKelurahanLayer = L.geoJSON(kelurahanGeojson, {
                style: {
                  color: 'grey',
                  weight: 2,
                  fillColor: 'grey',
                  fillOpacity: 0.15
                }
              });
              if (this.map) {
                this.selectedKelurahanLayer.addTo(this.map);
                console.log(`✅ Created selectedKelurahanLayer for ${kelurahanName}`);

                // Fit bounds to selected kelurahan
                const bounds = this.selectedKelurahanLayer.getBounds();
                if (bounds && bounds.isValid()) {
                  this.map.fitBounds(bounds, { padding: [30, 30] });
                  console.log('🔍 Fitted bounds to selected kelurahan');
                }
              }
            }

            // Hide ALL kelurahan (remove kelurahanBoundariesLayer)
            if (this.kelurahanBoundariesLayer && this.map) {
              this.map.removeLayer(this.kelurahanBoundariesLayer);
              this.kelurahanBoundariesLayer = null;
              console.log('🙈 Hidden all other kelurahan');
            }

            // Add blok layer to map
            this.blokBoundariesLayer.addTo(this.map);

            console.log(`✅ Blok boundaries with count displayed for ${kelurahanName}`);
          }
        } else {
          // Close loading popup and show no data message
          this.map?.closePopup(loadingPopup);
          const noDataPopup = L.popup()
            .setLatLng(kelurahanLayer.getBounds().getCenter())
            .setContent(`<div style="text-align: center; color: #f59e0b;">⚠️ No blok boundaries found for ${kelurahanName}</div>`)
            .openOn(this.map!);

          setTimeout(() => this.map?.closePopup(noDataPopup), 3000);
        }
      },
      error: (error) => {
        // Close loading popup
        this.map?.closePopup(loadingPopup);

        console.error('❌ Error loading blok boundaries or count:', error);
        const errorPopup = L.popup()
          .setLatLng(kelurahanLayer.getBounds().getCenter())
          .setContent(`<div style="text-align: center; color: #dc2626;">❌ Failed to load blok boundaries for ${kelurahanName}</div>`)
          .openOn(this.map!);

        setTimeout(() => this.map?.closePopup(errorPopup), 3000);
      }
    });
  }

  /**
   * Load bidang boundaries for specific blok from BPRD API
   */
  private loadBidangBoundaries(kdKec: string, kdKel: string, kdBlok: string, blokLayer: any): void {
    if (!this.map) {
      console.warn('Map not ready yet');
      return;
    }

    console.log(`📦 Loading bidang boundaries for blok ${kdBlok} (${kdKec}/${kdKel}/${kdBlok})`);

    // Show loading indicator
    const loadingPopup = L.popup()
      .setLatLng(blokLayer.getBounds().getCenter())
      .setContent('<div style="text-align: center;"><i class="ri-loader-line spin"></i> Loading bidang boundaries...</div>')
      .openOn(this.map);

    this.bprdApiService.getBidangBoundariesViaBackend(kdKec, kdKel, kdBlok).subscribe({
      next: (bidangBoundaries) => {
        // Close loading popup
        this.map?.closePopup(loadingPopup);

        console.log(`📡 Received ${bidangBoundaries.length} bidang boundaries for blok ${kdBlok}`);

        if (bidangBoundaries && bidangBoundaries.length > 0) {
          // Remove existing bidang layer
          if (this.bidangBoundariesLayer && this.map) {
            this.map.removeLayer(this.bidangBoundariesLayer);
          }

          // Create bidang boundaries layer with purple/violet color
          this.bidangBoundariesLayer = L.geoJSON([], {
            style: (feature) => ({
              color: '#9333ea', // Purple color for bidang
              weight: 2,
              opacity: 1,
              fillColor: '#c084fc',
              fillOpacity: 0.4,
              dashArray: '2, 2'
            }),
            onEachFeature: (feature, layer) => {
              const props = feature.properties || {};
              const nop = props.nop || 'N/A';

              // Debug: log available properties
              console.log('🔍 Bidang properties available:', Object.keys(props));
              console.log('📋 Bidang props:', props);

              // Extract no_urut directly (it should be available now)
              const noUrut = props.no_urut || 'UNKNOWN';

              layer.bindTooltip(noUrut, {
                permanent: true,
                direction: 'center',
                className: 'bidang-label',
                opacity: 0.9
              });

              // Hover effects and click handler
              layer.on({
                mouseover: (e) => {
                  const targetLayer = e.target;
                  targetLayer.setStyle({
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 0.6
                  });
                },
                mouseout: (e) => {
                  if (this.bidangBoundariesLayer) {
                    this.bidangBoundariesLayer.resetStyle(e.target);
                  }
                },
                dblclick: (e) => {
                  // Double click: Show bidang detail modal (consistent with kecamatan/kelurahan/blok)
                  // Skip if in edit mode
                  if (this.editMode !== 'none') {
                    console.log('⏭️ Skipping bidang detail - in edit mode');
                    return;
                  }

                  L.DomEvent.stopPropagation(e);

                  console.log(`🔍 Double-clicked bidang: ${nop} (no_urut: ${noUrut})`);
                  console.log('🔍 Full bidang properties:', props);

                  // Extract parameters for BPRD API call
                  const id = props.id || '';
                  const kdProp = props.kd_prop || '35';
                  const kdDati2 = props.kd_dati2 || '08';
                  const kdKec = props.kd_kec || '';
                  const kdKel = props.kd_kel || '';
                  const kdBlok = props.kd_blok || '';
                  const kdJnsOp = props.kd_jns_op || '0'; // Use from boundary data or default

                  // Validate no_urut before making API call
                  if (noUrut === 'UNKNOWN' || noUrut === 'N/A') {
                    console.warn('⚠️ No valid no_urut found. Available properties:', Object.keys(props));
                    alert('Tidak dapat menemukan nomor urut bidang. Periksa console untuk detail.');
                    return;
                  }

                  this.showBidangDetailModal(id, kdProp, kdDati2, kdKec, kdKel, kdBlok, noUrut, kdJnsOp);
                }
              });
            }
          });

          // Convert and add bidang boundaries
          let processedCount = 0;
          bidangBoundaries
            .filter(boundary => boundary.is_active)
            .forEach((boundary, index) => {
              try {
                // Convert geom (WKB hex) to GeoJSON
                const geoJsonFeature = this.convertBprdGeomToGeoJSON(boundary as any);
                if (geoJsonFeature && geoJsonFeature.geometry) {
                  this.bidangBoundariesLayer?.addData(geoJsonFeature);
                  processedCount++;
                } else {
                  console.warn(`⚠️ Empty geometry for bidang ${boundary.nop}`);
                }
              } catch (error) {
                console.error(`❌ Failed to process bidang ${boundary.nop}:`, error);
              }
            });

          console.log(`📊 Processed ${processedCount}/${bidangBoundaries.length} bidang boundaries`);

          if (this.map && this.bidangBoundariesLayer && processedCount > 0) {
            // Update navigation state
            this.selectedBlokForDrilldown = {
              kdKec,
              kdKel,
              kdBlok,
              nama: `Blok ${kdBlok}`
            };
            this.currentLevel = 'bidang';
            this.navigationStack = [
              { level: 'kecamatan', name: 'Semua Kecamatan' },
              { level: 'kelurahan', name: this.selectedKecamatanForDrilldown?.nama || 'Kecamatan' },
              { level: 'blok', name: this.selectedKelurahanForDrilldown?.nama || 'Kelurahan' }
            ];

            // Step 5: Create selectedBlokLayer - single polygon for this blok (like legacy layerBlok)
            if (this.selectedBlokLayer && this.map) {
              this.map.removeLayer(this.selectedBlokLayer);
              this.selectedBlokLayer = null;
            }

            // Create grey-styled layer from clicked blok
            if (blokLayer && blokLayer.toGeoJSON) {
              const blokGeojson = blokLayer.toGeoJSON();
              this.selectedBlokLayer = L.geoJSON(blokGeojson, {
                style: {
                  color: 'grey',
                  weight: 2,
                  fillColor: 'grey',
                  fillOpacity: 0.15
                }
              });
              if (this.map) {
                this.selectedBlokLayer.addTo(this.map);
                console.log(`✅ Created selectedBlokLayer for blok ${kdBlok}`);

                // Fit bounds to selected blok
                const bounds = this.selectedBlokLayer.getBounds();
                if (bounds && bounds.isValid()) {
                  this.map.fitBounds(bounds, { padding: [30, 30] });
                  console.log('🔍 Fitted bounds to selected blok');
                }
              }
            }

            // Hide ALL blok (remove blokBoundariesLayer)
            if (this.blokBoundariesLayer && this.map) {
              this.map.removeLayer(this.blokBoundariesLayer);
              this.blokBoundariesLayer = null;
              console.log('🙈 Hidden all other blok');
            }

            // Add bidang layer to map
            this.bidangBoundariesLayer.addTo(this.map);

            console.log(`✅ Bidang boundaries displayed for blok ${kdBlok}`);
          }
        } else {
          // Close loading popup and show no data message
          this.map?.closePopup(loadingPopup);
          const noDataPopup = L.popup()
            .setLatLng(blokLayer.getBounds().getCenter())
            .setContent(`<div style="text-align: center; color: #f59e0b;">⚠️ No bidang boundaries found for blok ${kdBlok}</div>`)
            .openOn(this.map!);

          setTimeout(() => this.map?.closePopup(noDataPopup), 3000);
        }
      },
      error: (error) => {
        // Close loading popup
        this.map?.closePopup(loadingPopup);

        console.error('❌ Error loading bidang boundaries:', error);
        const errorPopup = L.popup()
          .setLatLng(blokLayer.getBounds().getCenter())
          .setContent(`<div style="text-align: center; color: #dc2626;">❌ Failed to load bidang boundaries for blok ${kdBlok}</div>`)
          .openOn(this.map!);

        setTimeout(() => this.map?.closePopup(errorPopup), 3000);
      }
    });
  }

  /**
   * Clear blok drill-down and return to kelurahan view
   */
  clearBlokView(): void {
    // Clear blok layer
    if (this.blokBoundariesLayer && this.map) {
      this.map.removeLayer(this.blokBoundariesLayer);
      this.blokBoundariesLayer = null;
    }

    // Clear selectedKelurahanLayer (the single grey kelurahan polygon)
    if (this.selectedKelurahanLayer && this.map) {
      this.map.removeLayer(this.selectedKelurahanLayer);
      this.selectedKelurahanLayer = null;
      console.log('🗑️ Cleared selectedKelurahanLayer');
    }

    // Reset navigation state
    this.selectedKelurahanForDrilldown = null;
    this.currentLevel = 'kelurahan';

    // Fit bounds to selected kecamatan
    if (this.selectedKecamatanLayer && this.map) {
      const bounds = this.selectedKecamatanLayer.getBounds();
      if (bounds && bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [30, 30] });
        console.log('🔍 Fitted bounds to selected kecamatan');
      }
    }

    // Reload kelurahan boundaries for current kecamatan
    if (this.selectedKecamatanForDrilldown) {
      const kdKec = this.selectedKecamatanForDrilldown.kdKec;
      const kecamatanName = this.selectedKecamatanForDrilldown.nama;
      this.loadKelurahanBoundariesWithCount(kdKec, kecamatanName);
    }

    console.log('🔙 Returned to kelurahan view');
  }

  /**
   * Clear bidang drill-down and return to blok view
   */
  clearBidangView(): void {
    // Clear bidang layer
    if (this.bidangBoundariesLayer && this.map) {
      this.map.removeLayer(this.bidangBoundariesLayer);
      this.bidangBoundariesLayer = null;
    }

    // Clear selectedBlokLayer (the single grey blok polygon)
    if (this.selectedBlokLayer && this.map) {
      this.map.removeLayer(this.selectedBlokLayer);
      this.selectedBlokLayer = null;
      console.log('🗑️ Cleared selectedBlokLayer');
    }

    // Reset navigation state
    this.selectedBlokForDrilldown = null;
    this.currentLevel = 'blok';

    // Fit bounds to selected kelurahan
    if (this.selectedKelurahanLayer && this.map) {
      const bounds = this.selectedKelurahanLayer.getBounds();
      if (bounds && bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [30, 30] });
        console.log('🔍 Fitted bounds to selected kelurahan');
      }
    }

    // Reload blok boundaries for current kelurahan
    if (this.selectedKelurahanForDrilldown) {
      const kdKec = this.selectedKelurahanForDrilldown.kdKec;
      const kdKel = this.selectedKelurahanForDrilldown.kdKel;
      const kelurahanName = this.selectedKelurahanForDrilldown.nama;
      this.loadBlokBoundaries(kdKec, kdKel, kelurahanName, null);
    }

    console.log('🔙 Returned to blok view');
  }

  /**
   * Recreate kecamatan boundaries layer from cached data (no API call)
   */
  private recreateKecamatanLayerFromCache(): void {
    if (!this.map || !this.bprdKecamatanData || this.bprdKecamatanData.length === 0) {
      console.warn('Cannot recreate kecamatan layer: missing map or cached data');
      return;
    }

    console.log('🔄 Recreating kecamatan boundaries layer from cache...');

    // Ensure kecamatan list is loaded for bidang count merge
    if (this.kecamatanList.length === 0) {
      console.log('⚠️ Kecamatan list not loaded yet, loading now...');
      this.loadKecamatanData();
      // Note: This will be async, but layer will still be created with 0 bidang counts
      // In a real scenario, you might want to wait for the data or show a loading state
    }

    // Remove existing layer if any
    if (this.kecamatanBoundariesLayer && this.map) {
      this.map.removeLayer(this.kecamatanBoundariesLayer);
      this.kecamatanBoundariesLayer = null;
    }

    // Create layer from cached data with proper styling and merged bidang count
    this.kecamatanBoundariesLayer = L.geoJSON([], {
      style: (feature) => {
        // Get color from BPRD data or generate one (same as original loadBprdKecamatanBoundaries)
        const props = feature?.properties || {};
        const color = props.color || this.generateColorForKecamatan(props.nama || '');

        // Convert color format and ensure visibility
        let finalColor = '#FF6B35'; // Default bright color
        if (color && color.includes('rgba')) {
          finalColor = color;
        } else if (color && color.includes('RGBA')) {
          finalColor = color.replace('RGBA(', 'rgba(').toLowerCase();
        }

        return {
          color: finalColor,
          weight: 3,
          opacity: 1,
          fillColor: finalColor,
          fillOpacity: 0.4,
          dashArray: '5, 5'
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties || {};
        const kecamatanName = props.nama || props.nmKecamatan || 'N/A';
        const kdKec = props.kd_kec;

        // Find matching kecamatan data to get jumlah bidang (same merge logic as original)
        let jumlahBidang = 0;
        if (kdKec && this.kecamatanList.length > 0) {
          const matchingKecamatan = this.kecamatanList.find(k => k.kdKecamatan === kdKec);
          if (matchingKecamatan) {
            jumlahBidang = matchingKecamatan.jumlahBidang || 0;
          }
        }

        // Add permanent label (tooltip) in the center of polygon if enabled
        if (this.showKecamatanLabels) {
          // Create multi-line label with kecamatan name and bidang count
          const labelHtml = `
            <div style="text-align: center;">
              <div style="font-weight: bold; margin-bottom: 2px;">${kecamatanName}</div>
              <div style="color: #666; font-size: 0.9em;">(${jumlahBidang} bidang)</div>
            </div>
          `;

          layer.bindTooltip(labelHtml, {
            permanent: true,
            direction: 'center',
            className: 'kecamatan-label',
            opacity: 0.9
          });
        }

        layer.on({
          click: (e) => {
            // Single click: Load kelurahan boundaries (drill-down)
            L.DomEvent.stopPropagation(e); // Prevent zoom

            const kdKec = props.kd_kec;
            const kecamatanName = props.nama;

            console.log(`🔍 Clicked kecamatan: ${kecamatanName} (${kdKec})`);
            console.log('📍 Loading kelurahan boundaries with count...');

            // Load kelurahan boundaries with count for this kecamatan
            this.loadKelurahanBoundariesWithCount(kdKec, kecamatanName, e.target);
          }
        });
      }
    });

    // Process cached boundaries and add to layer
    this.bprdKecamatanData
      .filter(boundary => boundary.is_active)
      .forEach((boundary) => {
        try {
          const geoJsonFeature = this.convertBprdGeomToGeoJSON(boundary);
          if (geoJsonFeature && geoJsonFeature.geometry && this.kecamatanBoundariesLayer) {
            this.kecamatanBoundariesLayer.addData(geoJsonFeature);
          }
        } catch (error) {
          console.warn(`Failed to process cached boundary for ${boundary.nama}:`, error);
        }
      });

    // Add layer to map
    if (this.kecamatanBoundariesLayer && this.map) {
      this.map.addLayer(this.kecamatanBoundariesLayer);
      console.log('✅ Kecamatan boundaries layer recreated from cache');
    }
  }

  /**
   * Navigate back one level in the drill-down hierarchy
   */
  goBack(): void {
    console.log(`🔙 Going back from ${this.currentLevel}`);

    switch (this.currentLevel) {
      case 'kelurahan':
        this.clearKelurahanView();
        break;
      case 'blok':
        this.clearBlokView();
        break;
      case 'bidang':
        this.clearBidangView();
        break;
      default:
        console.log('Already at top level (kecamatan)');
        return; // Nothing to do
    }

    // Pop from stack after handling the view change
    if (this.navigationStack.length > 0) {
      this.navigationStack.pop();
    }

    console.log(`🎯 Now at level: ${this.currentLevel}`);
  }

  /**
   * Navigate directly to a specific level
   */
  goToLevel(targetLevel: 'kecamatan' | 'kelurahan' | 'blok' | 'bidang'): void {
    console.log(`🎯 Navigating directly to ${targetLevel} level`);

    if (targetLevel === 'kecamatan') {
      // Clear all drill-down layers and go back to kecamatan overview
      this.clearBidangView();
      this.clearBlokView();
      this.clearKelurahanView();

      this.currentLevel = 'kecamatan';
      this.selectedKecamatanForDrilldown = null;
      this.selectedKelurahanForDrilldown = null;
      this.selectedBlokForDrilldown = null;
      this.navigationStack = [];
    }

    console.log(`✅ Successfully navigated to ${targetLevel} level`);
  }

  /**
   * Show bidang detail modal with data from BPRD API
   */
  showBidangDetailModal(id: string, kdProp: string, kdDati2: string, kdKec: string, kdKel: string, kdBlok: string, noUrut: string, kdJnsOp: string): void {
    console.log(`🏠 Loading bidang detail for NOP parameters:`, {
      id, kdProp, kdDati2, kdKec, kdKel, kdBlok, noUrut, kdJnsOp
    });

    this.isLoadingBidangDetail = true;
    this.showBidangModal = true;
    this.selectedBidangDetail = null;

    // Call BPRD API for bidang detail
    this.bprdApiService.getBidangDetail(id, kdProp, kdDati2, kdKec, kdKel, kdBlok, noUrut, kdJnsOp).subscribe({
      next: (bidangDetail: BidangDetailResponse) => {
        console.log('✅ Received bidang detail:', bidangDetail);
        this.selectedBidangDetail = bidangDetail;
        this.isLoadingBidangDetail = false;
      },
      error: (error: any) => {
        console.error('❌ Error loading bidang detail:', error);
        this.isLoadingBidangDetail = false;
        // You might want to show an error message in the modal
      }
    });
  }

  /**
   * Close bidang detail modal
   */
  closeBidangDetailModal(): void {
    this.showBidangModal = false;
    this.selectedBidangDetail = null;
    this.isLoadingBidangDetail = false;
  }

  // ====================== TEMATIK METHODS ======================

  /**
   * Check if tematik layers exist
   */
  get hasTematikLayers(): boolean {
    return this.tematikLayers && Object.keys(this.tematikLayers).length > 0;
  }

  /**
   * Toggle tematik section visibility
   */
  toggleTematikSection(): void {
    this.showTematikSection = !this.showTematikSection;
  }

  /**
   * Open tematik filter modal
   */
  openTematikModal(): void {
    this.showTematikModal = true;
  }

  /**
   * Close tematik filter modal
   */
  closeTematikModal(): void {
    this.showTematikModal = false;
  }

  /**
   * Check if tematik can be loaded
   */
  canLoadTematik(): boolean {
    return !!(this.selectedTematikType &&
      this.selectedTematikKecamatan &&
      this.selectedTematikKelurahan);
  }

  /**
   * Get tematik type label for display
   */
  getTematikTypeLabel(): string {
    switch (this.selectedTematikType) {
      case 'gunaTanah': return 'Guna Tanah';
      case 'klasifikasi': return 'Klasifikasi';
      case 'zona': return 'Zona Nilai Tanah';
      default: return this.selectedTematikType;
    }
  }

  /**
   * Get tematik kecamatan name for display
   */
  getTematikKecamatanName(): string {
    const kecamatan = this.kecamatanList.find(k => k.kdKecamatan === this.selectedTematikKecamatan);
    return kecamatan ? kecamatan.nmKecamatan : this.selectedTematikKecamatan;
  }

  /**
   * Get kelurahan name by ID
   */
  getKelurahanNameById(kelId: string): string {
    const kelurahan = this.kelurahanList.find((k: any) => k.kdKelurahan === kelId);
    return kelurahan ? kelurahan.nmKelurahan : kelId;
  }

  /**
   * Handle tematik kecamatan change - use existing kelurahan data
   */
  onTematikKecamatanChange(): void {
    console.log(`🏠 Tematik kecamatan changed to: ${this.selectedTematikKecamatan}`);

    // Reset kelurahan selection
    this.selectedTematikKelurahan = '';

    // Load kelurahan data using existing method from main page
    if (this.selectedTematikKecamatan && this.selectedTematikKecamatan !== this.selectedKecamatan?.kdKecamatan) {
      // Find kecamatan object by kdKecamatan
      const kecamatanObj = this.kecamatanList.find(k => k.kdKecamatan === this.selectedTematikKecamatan);
      if (kecamatanObj) {
        // Use existing onKecamatanChange logic to load kelurahan
        const previousKecamatan = this.selectedKecamatan;
        this.selectedKecamatan = kecamatanObj;
        this.onKecamatanChange();
        // Don't restore previous selection to avoid conflicts
      }
    }
  }

  /**
   * Load tematik data from BPRD API
   */
  loadTematikData(): void {
    if (!this.selectedTematikType || !this.selectedTematikKecamatan || !this.selectedTematikKelurahan) {
      console.warn('⚠️ Missing required tematik parameters');
      return;
    }

    console.log('🎨 Loading tematik data with parameters:', {
      type: this.selectedTematikType,
      kecamatan: this.selectedTematikKecamatan,
      kelurahan: this.selectedTematikKelurahan,
      tahun: this.selectedTematikTahun
    });

    this.isLoadingTematik = true;

    // Prepare tematik request payload - kelurahan as array with single value
    const tematikRequest = {
      id_kecamatan: this.selectedTematikKecamatan,
      id_kelurahan: [this.selectedTematikKelurahan], // Convert single value to array
      tahun: parseInt(this.selectedTematikTahun),
      tematik: this.selectedTematikType
    };

    // Call backend tematik endpoint
    this.bprdApiService.getTematikData(tematikRequest).subscribe({
      next: (tematikResponse: any) => {
        console.log('✅ Received tematik data:', tematikResponse);
        this.processTematikResponse(tematikResponse);
        this.isLoadingTematik = false;

        // Close modal on success
        this.closeTematikModal();
      },
      error: (error: any) => {
        console.error('❌ Error loading tematik data:', error);
        this.isLoadingTematik = false;
      }
    });
  }

  /**
   * Process tematik response and display on map
   */
  processTematikResponse(tematikResponse: any): void {
    try {
      console.log('🔄 Processing tematik response...');

      this.tematikLayers = tematikResponse.layer || {};
      this.tematikLayersArray = [];

      // Convert layers object to array for easier iteration
      for (const [key, layerData] of Object.entries(this.tematikLayers)) {
        const layer = layerData as any;

        // Convert RGB(r,g,b) format to valid CSS color
        let cssColor = '#3388ff'; // default color
        if (layer.color && typeof layer.color === 'string') {
          // Handle RGB(r,g,b) format
          const rgbMatch = layer.color.match(/RGB\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
          if (rgbMatch) {
            const r = parseInt(rgbMatch[1]);
            const g = parseInt(rgbMatch[2]);
            const b = parseInt(rgbMatch[3]);
            cssColor = `rgb(${r},${g},${b})`;
            console.log(`🎨 Converted layer ${key} color ${layer.color} to ${cssColor}`);
          } else {
            // If it's already in a valid CSS format, use as is
            cssColor = layer.color;
          }
        }

        this.tematikLayersArray.push({
          key: key,
          ...layer,
          color: cssColor, // Use converted CSS color
          label: layer.label || `Layer ${key}` // Add default label
        });
      }

      console.log('📊 Tematik layers processed:', this.tematikLayersArray);

      // Display tematik layers on map
      this.displayTematikOnMap();

    } catch (error) {
      console.error('❌ Error processing tematik response:', error);
    }
  }

  /**
   * Display tematik data on map
   */
  displayTematikOnMap(): void {
    if (!this.map) return;

    // Clear existing tematik layer
    if (this.tematikLayer) {
      this.map.removeLayer(this.tematikLayer);
      this.tematikLayer = null;
    }

    // Prepare features for all layers
    const allFeatures: any[] = [];

    this.tematikLayersArray.forEach((layer: any) => {
      console.log(`🔍 Processing layer ${layer.key} with color: ${layer.color}, data count: ${layer.data?.length || 0}`);

      if (layer.data && Array.isArray(layer.data)) {
        layer.data.forEach((bidang: any) => {
          if (bidang.geojson) {
            // Debug: Check bidang structure
            console.log(`🔍 Processing bidang:`, {
              nop: bidang.nop,
              hasGeojson: !!bidang.geojson,
              geojsonType: bidang.geojson?.type,
              layerKey: layer.key,
              layerColor: layer.color
            });

            // Create proper GeoJSON Feature structure
            let geometry;
            if (bidang.geojson.coordinates) {
              // If geojson has coordinates directly, it's a geometry object
              geometry = {
                type: bidang.geojson.type,
                coordinates: bidang.geojson.coordinates
              };
            } else if (bidang.geojson.geometry) {
              // If geojson has geometry property, use it
              geometry = bidang.geojson.geometry;
            } else {
              // Fallback: treat the whole geojson as geometry
              geometry = bidang.geojson;
            }

            const feature = {
              type: 'Feature',
              geometry: geometry,
              properties: {
                // First add existing properties from geojson
                ...(bidang.geojson.properties || {}),
                // Then add all bidang properties
                ...bidang,
                // Finally add layer metadata (these will override any conflicts)
                layerKey: layer.key,
                layerLabel: layer.label || `Layer ${layer.key}`,
                layerColor: layer.color,
                // Ensure essential properties are always available
                nop: bidang.nop || 'N/A',
                id: bidang.id || `${layer.key}_${bidang.nop || Math.random()}`
              }
            };

            console.log(`✅ Added bidang ${bidang.nop} with color ${layer.color} to layer ${layer.key}`);
            console.log(`🔧 Feature properties:`, feature.properties);
            allFeatures.push(feature);
          } else {
            console.warn(`⚠️ Bidang ${bidang.nop} has no geojson data`);
          }
        });
      }
    });

    console.log(`🗺️ Displaying ${allFeatures.length} tematik features on map`);

    if (allFeatures.length === 0) {
      console.warn('⚠️ No tematik features to display');
      return;
    }

    // Create GeoJSON layer for tematik data
    this.tematikLayer = L.geoJSON(allFeatures, {
      style: (feature: any) => {
        // Debug: Check feature structure
        if (!feature.properties) {
          console.error(`❌ Feature has no properties:`, feature);
          return {
            fillColor: '#ff0000', // Red for error
            weight: 2,
            opacity: 1,
            color: '#ff0000',
            fillOpacity: 0.6
          };
        }

        const layerColor = feature.properties.layerColor || '#3388ff';
        const nop = feature.properties.nop || 'UNKNOWN';
        const layerKey = feature.properties.layerKey || 'UNKNOWN';

        // Only log if properties are missing (to reduce console spam)
        if (!feature.properties.layerColor || !feature.properties.nop || !feature.properties.layerKey) {
          console.warn(`⚠️ Missing properties for feature:`, {
            layerKey: layerKey,
            layerColor: layerColor,
            nop: nop,
            hasLayerColor: !!feature.properties.layerColor,
            hasNop: !!feature.properties.nop,
            hasLayerKey: !!feature.properties.layerKey,
            allProperties: Object.keys(feature.properties)
          });
        } else {
          console.log(`🎨 Applying style to bidang ${nop}: color=${layerColor}, layer=${layerKey}`);
        }

        return {
          fillColor: layerColor,
          weight: 2,
          opacity: 1,
          color: layerColor, // Use same color for border
          fillOpacity: 0.6
        };
      },
      onEachFeature: (feature: any, layer: any) => {
        const props = feature.properties;

        // Add single click event handler for bidang detail modal (no popup)
        layer.on('click', (e: any) => {
          console.log('🎨 Tematik bidang clicked:', props);

          // Extract NOP components from the bidang data (use same defaults as normal bidang)
          const id = props.id || '';
          const kdProp = props.kd_prop || '35';
          const kdDati2 = props.kd_dati2 || '08';
          const kdKec = props.kd_kec || '';
          const kdKel = props.kd_kel || '';
          const kdBlok = props.kd_blok || '';
          const noUrut = props.no_urut || '';
          const kdJnsOp = props.kd_jns_op || '0';

          console.log('🏠 Opening bidang detail modal for tematik bidang:', {
            id, kdProp, kdDati2, kdKec, kdKel, kdBlok, noUrut, kdJnsOp
          });

          // Validate no_urut before making API call
          if (noUrut === 'UNKNOWN' || noUrut === 'N/A' || !noUrut) {
            console.warn('⚠️ No valid no_urut found for tematik bidang. Available properties:', Object.keys(props));
            alert('Tidak dapat menemukan nomor urut bidang. Periksa console untuk detail.');
            return;
          }

          // Call the same method used for normal bidang
          this.showBidangDetailModal(id, kdProp, kdDati2, kdKec, kdKel, kdBlok, noUrut, kdJnsOp);

          // Stop event propagation to prevent map events
          e.originalEvent.stopPropagation();
        });
      }
    });

    // Add tematik layer to map
    this.tematikLayer.addTo(this.map);

    // Fit map bounds to tematik data
    if (allFeatures.length > 0) {
      this.map.fitBounds(this.tematikLayer.getBounds(), {
        padding: [20, 20]
      });
    }

    console.log('✅ Tematik data displayed on map successfully');
  }

  /**
   * Clear tematik data from map
   */
  clearTematikData(): void {
    if (this.map && this.tematikLayer) {
      this.map.removeLayer(this.tematikLayer);
      this.tematikLayer = null;
    }

    this.tematikLayers = {};
    this.tematikLayersArray = [];

    console.log('🧹 Tematik data cleared from map');
  }

  // ==========================================
  // Layer Legend Control Methods
  // ==========================================

  /**
   * Toggle layer legend panel visibility
   */
  toggleLayerLegend(): void {
    this.showLayerLegend = !this.showLayerLegend;
  }

  /**
   * Toggle visibility of overlay layers
   */
  toggleLayerVisibility(layerType: string): void {
    const isVisible = (this.layerVisibility as any)[layerType];

    switch (layerType) {
      case 'batasKecamatan':
        if (this.kecamatanBoundariesLayer && this.map) {
          if (isVisible) {
            this.map.addLayer(this.kecamatanBoundariesLayer);
          } else {
            this.map.removeLayer(this.kecamatanBoundariesLayer);
          }
        }
        break;
      case 'batasKelurahan':
        if (this.kelurahanBoundariesLayer && this.map) {
          if (isVisible) {
            this.map.addLayer(this.kelurahanBoundariesLayer);
          } else {
            this.map.removeLayer(this.kelurahanBoundariesLayer);
          }
        }
        break;
      case 'batasBlok':
        if (this.blokBoundariesLayer && this.map) {
          if (isVisible) {
            this.map.addLayer(this.blokBoundariesLayer);
          } else {
            this.map.removeLayer(this.blokBoundariesLayer);
          }
        }
        break;
      case 'bidang':
        if (this.bidangBoundariesLayer && this.map) {
          if (isVisible) {
            this.map.addLayer(this.bidangBoundariesLayer);
          } else {
            this.map.removeLayer(this.bidangBoundariesLayer);
          }
        }
        break;
    }
  }

  /**
   * Update opacity of overlay layers
   */
  updateLayerOpacity(layerType: string, opacity: number): void {
    let layer: L.GeoJSON | null = null;

    switch (layerType) {
      case 'batasKecamatan':
        layer = this.kecamatanBoundariesLayer;
        break;
      case 'batasKelurahan':
        layer = this.kelurahanBoundariesLayer;
        break;
      case 'batasBlok':
        layer = this.blokBoundariesLayer;
        break;
      case 'bidang':
        layer = this.bidangBoundariesLayer;
        break;
    }

    if (layer) {
      layer.setStyle({ fillOpacity: opacity * 0.5, opacity: opacity });
    }
  }

  /**
   * Change base layer
   */
  changeBaseLayer(layerKey: string): void {
    if (this.map && this.baseLayers[layerKey]) {
      // Remove current base layer
      if (this.currentBaseLayer) {
        this.map.removeLayer(this.currentBaseLayer);
      }

      // Add new base layer
      this.currentBaseLayer = this.baseLayers[layerKey];
      this.currentBaseLayer.addTo(this.map);
      this.currentBaseLayer.bringToBack();
      this.selectedBaseLayer = layerKey;
    }
  }

  /**
   * Update base layer opacity
   */
  updateBaseLayerOpacity(opacity: number): void {
    if (this.currentBaseLayer) {
      this.currentBaseLayer.setOpacity(opacity);
    }
  }

  // ==========================================
  // Geometry Editing Methods
  // ==========================================

  /**
   * Initialize editable layer for drawing/editing
   */
  private initEditableLayer(): void {
    if (this.map && !this.editableLayer) {
      this.editableLayer = new L.FeatureGroup();
      this.map.addLayer(this.editableLayer);
      console.log('✅ Editable layer initialized');
    }
  }

  /**
   * Toggle edit mode (draw, edit, delete) - updated to accept target parameter
   */
  toggleEditMode(mode: 'draw' | 'edit' | 'delete' | 'move' | 'none', target?: 'kecamatan' | 'kelurahan' | 'blok' | 'bidang'): void {
    if (!this.map) return;

    // Initialize editable layer if needed
    this.initEditableLayer();

    // If clicking same mode AND same target, turn it off
    if (this.editMode === mode && (!target || this.editTarget === target)) {
      this.editMode = 'none';
      this.removeDrawControl();
      return;
    }

    // Remove existing draw control
    this.removeDrawControl();

    // Set the target BEFORE setting mode
    if (target) {
      this.editTarget = target;
    }

    // Set new mode
    this.editMode = mode;

    // Setup draw control based on mode
    if (mode === 'draw') {
      this.setupDrawMode();
    } else if (mode === 'edit') {
      this.setupEditMode();
    } else if (mode === 'move') {
      this.setupMoveMode();
    } else if (mode === 'delete') {
      this.setupDeleteMode();
    }
  }

  /**
   * Setup draw mode for creating new polygons using Geoman
   */
  private setupDrawMode(): void {
    if (!this.map) {
      console.error('❌ setupDrawMode: No map');
      return;
    }

    // Enable Geoman draw mode for polygons
    (this.map as any).pm.enableDraw('Polygon', {
      snappable: true,
      allowSelfIntersection: false,
      finishOn: 'dblclick',
      templineStyle: {
        color: '#3388ff',
        weight: 2
      },
      hintlineStyle: {
        color: '#3388ff',
        dashArray: '5, 5'
      },
      pathOptions: {
        color: '#3388ff',
        weight: 2,
        fillColor: '#3388ff',
        fillOpacity: 0.3
      }
    });

    // Handle Geoman draw created event
    this.map.on('pm:create', (e: any) => {
      const layer = e.layer;

      // Track drawn layer for removal on cancel
      this.drawnLayers.push(layer);

      // Add to pending changes (new bidang will have temporary ID)
      const tempId = 'new_' + Date.now();
      const geojson = layer.toGeoJSON();
      this.pendingChanges.push({
        id: tempId,
        geom: geojson.geometry,
        target: this.editTarget || 'bidang'
      });

      console.log('🆕 New polygon drawn via Geoman, pending save:', tempId);
    });

    console.log('✏️ Draw mode enabled (Geoman)');
  }

  /**
   * Setup edit mode for modifying existing polygons
   * Using Leaflet-Geoman instead of Leaflet-Draw for better programmatic control
   * 
   * LEGACY BEHAVIOR (from screenshot):
   * - Only the SELECTED polygon is shown (e.g., one kecamatan)
   * - All other layers are HIDDEN (no kelurahan labels underneath)
   * - Plain color fill (like brown/olive), simple style
   * - Vertex handles appear on the single polygon
   */
  private setupEditMode(): void {
    if (!this.map) {
      console.error('❌ setupEditMode: No map instance');
      return;
    }

    console.log('=== SETUP EDIT MODE (Geoman) ===');
    console.log('currentLevel:', this.currentLevel);
    console.log('editTarget:', this.editTarget);

    // Determine which layer to edit based on editTarget (set by button click)
    let sourceLayer: L.GeoJSON | null = null;
    let selectedItem: any = null;
    let useSinglePolygonFromCache = false;
    let cacheData: any[] = [];
    let idProperty: string = '';

    switch (this.editTarget) {
      case 'kecamatan':
        // Edit ONLY the selected kecamatan boundary (NOT all kecamatans!)
        selectedItem = this.selectedKecamatanForDrilldown;
        cacheData = this.bprdKecamatanData;
        idProperty = 'kd_kec';

        if (selectedItem && cacheData.length > 0) {
          useSinglePolygonFromCache = true;
        } else {
          console.error('❌ No selected kecamatan or cached data');
          this.editMode = 'none';
          return;
        }
        break;

      case 'kelurahan':
        // Edit ONLY the selected kelurahan boundary
        selectedItem = this.selectedKelurahanForDrilldown;
        cacheData = this.bprdKelurahanData;
        idProperty = 'kd_kel';

        console.log('🔍 Kelurahan edit check:');
        console.log('  - selectedKelurahanForDrilldown:', selectedItem);
        console.log('  - bprdKelurahanData length:', cacheData.length);

        // If cache is empty but we have the layer, extract geometry from the layer
        console.log('🔍 Checking fallback options:');
        console.log('  - kelurahanBoundariesLayer exists:', !!this.kelurahanBoundariesLayer);
        console.log('  - selectedKelurahanLayer exists:', !!this.selectedKelurahanLayer);

        if (selectedItem && cacheData.length === 0) {
          // Try extracting from kelurahanBoundariesLayer first
          if (this.kelurahanBoundariesLayer) {
            console.log('⚠️ Cache empty, extracting geometry from kelurahanBoundariesLayer');
            this.kelurahanBoundariesLayer.eachLayer((layer: any) => {
              const feature = layer.feature;
              if (feature && feature.properties) {
                const layerKdKel = feature.properties.kd_kel;
                if (layerKdKel === selectedItem.kdKel) {
                  cacheData.push({
                    kd_kel: layerKdKel,
                    kd_kec: feature.properties.kd_kec,
                    nama: feature.properties.nama,
                    geom: feature.geometry
                  });
                  console.log('✅ Extracted kelurahan geometry from kelurahanBoundariesLayer');
                }
              }
            });
          }

          // If still empty, try selectedKelurahanLayer (the grey single kelurahan polygon)
          if (cacheData.length === 0 && this.selectedKelurahanLayer) {
            console.log('⚠️ Trying selectedKelurahanLayer fallback');
            this.selectedKelurahanLayer.eachLayer((layer: any) => {
              const feature = layer.feature;
              if (feature && feature.geometry) {
                cacheData.push({
                  kd_kel: selectedItem.kdKel,
                  kd_kec: selectedItem.kdKec,
                  nama: selectedItem.nama,
                  geom: feature.geometry
                });
                console.log('✅ Extracted kelurahan geometry from selectedKelurahanLayer');
              }
            });
          }

          // Update the class cache
          this.bprdKelurahanData = cacheData;
        }

        if (selectedItem && cacheData.length > 0) {
          useSinglePolygonFromCache = true;
        } else {
          console.error('❌ No selected kelurahan or cached data');
          console.error('  - selectedItem exists:', !!selectedItem);
          console.error('  - cacheData.length:', cacheData.length);
          this.editMode = 'none';
          return;
        }
        break;

      case 'blok':
        // Edit ONLY the selected blok boundary
        selectedItem = this.selectedBlokForDrilldown;
        cacheData = this.bprdBlokData;
        idProperty = 'kd_blok';

        console.log('🔍 Blok edit check:');
        console.log('  - selectedBlokForDrilldown:', selectedItem);
        console.log('  - bprdBlokData length:', cacheData.length);

        // If cache is empty but we have the layer, extract geometry from the layer
        if (selectedItem && cacheData.length === 0 && this.blokBoundariesLayer) {
          console.log('⚠️ Cache empty, extracting geometry from blokBoundariesLayer');
          this.blokBoundariesLayer.eachLayer((layer: any) => {
            const feature = layer.feature;
            if (feature && feature.properties) {
              const layerKdBlok = feature.properties.kd_blok;
              if (layerKdBlok === selectedItem.kdBlok) {
                cacheData.push({
                  kd_blok: layerKdBlok,
                  kd_kec: feature.properties.kd_kec,
                  kd_kel: feature.properties.kd_kel,
                  geom: feature.geometry
                });
                console.log('✅ Extracted blok geometry from layer');
              }
            }
          });
          this.bprdBlokData = cacheData;
        }

        if (selectedItem && cacheData.length > 0) {
          useSinglePolygonFromCache = true;
        } else {
          console.error('❌ No selected blok or cached data');
          console.error('  - selectedItem exists:', !!selectedItem);
          console.error('  - cacheData.length:', cacheData.length);
          this.editMode = 'none';
          return;
        }
        break;

      case 'bidang':
        // Edit all bidang in the current view
        sourceLayer = this.bidangBoundariesLayer;
        break;

      default:
        console.error(`❌ Unknown editTarget: ${this.editTarget}`);
        this.editMode = 'none';
        return;
    }

    // For kecamatan/kelurahan/blok editing: create single polygon from cached data
    if (useSinglePolygonFromCache && selectedItem) {
      this.setupSinglePolygonEditMode(selectedItem, cacheData, idProperty);
      return;
    }

    if (!sourceLayer) {
      console.error(`❌ No source layer for ${this.editTarget}`);
      alert(`Tidak ada data ${this.editTarget} untuk diedit.`);
      this.editMode = 'none';
      return;
    }

    // Enable Geoman on the map
    if (!(this.map as any).pm) {
      console.error('❌ Geoman not initialized on map');
      return;
    }

    // Store reference to source layer for restoration later
    (this as any)._editSourceLayer = sourceLayer;
    (this as any)._hiddenLayers = [];

    // HIDE ALL OTHER LAYERS (like legacy) - plain map with just the polygon being edited
    const layersToHide = [
      this.kelurahanBoundariesLayer,
      this.blokBoundariesLayer,
      this.bidangBoundariesLayer
    ].filter(l => l && l !== sourceLayer);

    layersToHide.forEach(layer => {
      if (layer && this.map?.hasLayer(layer)) {
        this.map.removeLayer(layer);
        (this as any)._hiddenLayers.push(layer);
        console.log('🙈 Hidden layer during edit');
      }
    });

    // For kecamatan/kelurahan/blok editing, only edit the SINGLE selected polygon
    if (this.editTarget !== 'bidang' && selectedItem) {
      // Find the specific feature to edit
      let editableFeature: any = null;
      // Use correct property names (kdKec, kdKel, kdBlok, NOT kdKecamatan etc)
      const targetId = selectedItem.kdKec || selectedItem.kdKel || selectedItem.kdBlok || selectedItem.id;

      console.log('🔍 Looking for feature with targetId:', targetId);
      console.log('🔍 selectedItem:', selectedItem);

      sourceLayer.eachLayer((layer: any) => {
        const props = layer.feature?.properties || {};
        const layerId = props.kd_kec || props.kd_kel || props.kd_blok || props.id;

        console.log('🔍 Checking layer:', layerId, 'vs target:', targetId);

        if (layerId === targetId) {
          editableFeature = layer;
          console.log('✅ Found matching feature!');
        } else {
          // Hide other polygons in the same layer
          if (layer.setStyle) {
            layer.setStyle({ opacity: 0, fillOpacity: 0 });
          }
        }
      });

      if (editableFeature) {
        // Apply edit style - plain olive/brown color like legacy
        editableFeature.setStyle({
          color: '#5c5c3d', // Olive border
          weight: 2,
          fillColor: '#8b7355', // Brown fill like legacy screenshot
          fillOpacity: 0.8
        });

        // Enable Geoman editing ONLY on this single feature
        if (editableFeature.pm) {
          editableFeature.pm.enable({
            allowSelfIntersection: false,
            snappable: true
          });

          const id = targetId;
          (editableFeature as any)._editId = id;
          (editableFeature as any)._editTarget = this.editTarget;

          // Listen for edit events
          editableFeature.on('pm:edit', (e: any) => {
            console.log(`📝 pm:edit fired for ${this.editTarget} id=${id}`);
            const editedGeoJson = e.target.toGeoJSON();

            const existingIdx = this.pendingChanges.findIndex(c => c.id === id);
            if (existingIdx >= 0) {
              this.pendingChanges[existingIdx].geom = editedGeoJson.geometry;
            } else {
              this.pendingChanges.push({
                id: id,
                geom: editedGeoJson.geometry,
                target: this.editTarget || 'kecamatan'
              });
            }
            console.log(`✅ Change tracked: ${this.editTarget} id=${id}`);
          });

          console.log(`✅ Enabled editing on single ${this.editTarget}: ${id}`);
        }
      }
    } else {
      // For BIDANG editing: enable on all visible bidang (but one at a time via click)
      let enabledCount = 0;

      sourceLayer.eachLayer((layer: any) => {
        if (layer.toGeoJSON) {
          const geoJson = layer.toGeoJSON();
          const props = geoJson.properties || {};

          if (!this.isValidGeometry(geoJson.geometry)) {
            return;
          }

          const id = props.id || props.nop;
          (layer as any)._editId = id;
          (layer as any)._editTarget = 'bidang';

          // Apply editing style
          layer.setStyle({
            color: '#f97316',
            weight: 2,
            fillColor: '#fed7aa',
            fillOpacity: 0.5
          });

          // Enable Geoman editing with optimized settings for performance
          if (layer.pm) {
            layer.pm.enable({
              // Disable expensive features to reduce lag with many polygons
              allowSelfIntersection: true,  // Disable check during drag for performance
              snappable: false,             // Disable snapping to other layers (expensive)
              snapDistance: 0,              // No snap distance
              preventMarkerRemoval: true,   // Prevent accidental vertex removal
              limitMarkersToCount: 100      // Limit markers if polygon has too many vertices
            });

            layer.on('pm:edit', (e: any) => {
              const editedGeoJson = e.target.toGeoJSON();
              const existingIdx = this.pendingChanges.findIndex(c => c.id === id);
              if (existingIdx >= 0) {
                this.pendingChanges[existingIdx].geom = editedGeoJson.geometry;
              } else {
                this.pendingChanges.push({
                  id: id,
                  geom: editedGeoJson.geometry,
                  target: 'bidang'
                });
              }
            });

            enabledCount++;
          }
        }
      });

      console.log(`✅ Enabled editing on ${enabledCount} bidang polygons (optimized settings)`);
    }

    console.log('=== EDIT MODE SETUP COMPLETE ===');
  }

  /**
   * Setup edit mode with a SINGLE polygon extracted from cached data
   * This avoids loading all polygons and only shows the one selected for editing
   * Works for kecamatan, kelurahan, and blok
   */
  private setupSinglePolygonEditMode(selectedItem: any, cacheData: any[], idProperty: string): void {
    if (!this.map) return;

    // Get the target ID from selectedItem based on the type
    // selectedItem uses camelCase (kdKec, kdKel, kdBlok) 
    // cache uses snake_case (kd_kec, kd_kel, kd_blok)
    let targetId: string;
    switch (this.editTarget) {
      case 'kecamatan':
        targetId = selectedItem.kdKec;
        break;
      case 'kelurahan':
        targetId = selectedItem.kdKel;
        break;
      case 'blok':
        targetId = selectedItem.kdBlok;
        break;
      default:
        targetId = selectedItem.kdKec || selectedItem.kdKel || selectedItem.kdBlok;
    }

    console.log(`📍 Setting up single polygon edit for ${this.editTarget}:`, targetId);
    console.log('📍 selectedItem:', selectedItem);
    console.log('📍 Using idProperty:', idProperty);
    console.log('📍 cacheData length:', cacheData.length);

    // Hide ALL current layers (clean map, just the editable polygon)
    const allLayers = [
      this.kecamatanBoundariesLayer,
      this.kelurahanBoundariesLayer,
      this.blokBoundariesLayer,
      this.bidangBoundariesLayer
    ];

    (this as any)._hiddenLayers = [];

    allLayers.forEach(layer => {
      if (layer && this.map?.hasLayer(layer)) {
        this.map.removeLayer(layer);
        (this as any)._hiddenLayers.push(layer);
        console.log('🙈 Hidden layer during single polygon edit');
      }
    });

    // Find the selected polygon geometry from cached data
    let selectedGeometry: any = null;
    let selectedBoundaryData: any = null;

    // Debug: Show first item in cache to see its structure
    if (cacheData.length > 0) {
      console.log('📋 First cache item structure:', Object.keys(cacheData[0]));
      console.log('📋 First cache item:', JSON.stringify(cacheData[0]).substring(0, 200));
    }

    for (const boundaryData of cacheData) {
      const boundaryId = (boundaryData as any)[idProperty];
      console.log('🔍 Checking cached data:', boundaryId, 'vs', targetId, `(match: ${boundaryId === targetId})`);

      if (boundaryId === targetId) {
        selectedBoundaryData = boundaryData;
        // Try geojson first (kecamatan), then geom (kelurahan/blok), then geometry
        selectedGeometry = boundaryData.geojson || boundaryData.geom || boundaryData.geometry;
        console.log(`✅ Found matching ${this.editTarget} in cache!`);
        console.log('📐 Geometry type:', typeof selectedGeometry);
        break;
      }
    }

    if (!selectedGeometry) {
      console.error(`❌ Could not find geometry for selected ${this.editTarget} in cache`);
      alert(`Tidak dapat menemukan geometry ${this.editTarget} yang dipilih.`);
      this.editMode = 'none';
      return;
    }

    // Create GeoJSON feature for the single polygon
    let geoJsonData: any;

    if (typeof selectedGeometry === 'object' && (selectedGeometry.type || selectedGeometry.coordinates)) {
      geoJsonData = {
        type: 'Feature',
        properties: {
          id: targetId,
          kd_kec: targetId,
          nama: selectedItem.nama
        },
        geometry: selectedGeometry
      };
    } else {
      console.error('❌ Unknown geometry format:', selectedGeometry);
      this.editMode = 'none';
      return;
    }

    // Create the single polygon layer
    const singlePolygonLayer = L.geoJSON(geoJsonData, {
      style: {
        color: '#5c5c3d', // Olive border like legacy
        weight: 2,
        fillColor: '#8b7355', // Brown fill like legacy screenshot  
        fillOpacity: 0.8
      }
    });

    singlePolygonLayer.addTo(this.map);

    // Store for cleanup
    (this as any)._tempEditableLayer = singlePolygonLayer;
    (this as any)._editSourceLayer = singlePolygonLayer;

    // SINGLE-VERTEX HOVER EDITING (like legacy OpenLayers)
    // Shows ONLY ONE vertex marker - the one nearest to the mouse cursor
    singlePolygonLayer.eachLayer((layer: any) => {
      (layer as any)._editId = targetId;
      (layer as any)._editTarget = this.editTarget;

      // Create and enable the single-vertex editor
      const editor = enableSingleVertexEdit(
        this.map!,
        layer as L.Polygon,
        (editedLayer: L.Polygon | L.Polyline, geojson: any) => {
          console.log(`📝 Vertex edited for ${this.editTarget} id=${targetId}`);

          const existingIdx = this.pendingChanges.findIndex(c => c.id === targetId);
          if (existingIdx >= 0) {
            this.pendingChanges[existingIdx].geom = geojson.geometry;
          } else {
            this.pendingChanges.push({
              id: targetId,
              geom: geojson.geometry,
              target: this.editTarget || 'kecamatan'
            });
          }
          console.log(`✅ Change tracked: ${this.editTarget} id=${targetId}`);
        }
      );

      // Store editor reference for cleanup
      (layer as any)._singleVertexEditor = editor;
    });

    // Zoom to the polygon
    this.map.fitBounds(singlePolygonLayer.getBounds(), { padding: [50, 50] });

    console.log(`✅ Single polygon edit mode enabled for ${this.editTarget}: ${targetId}`);
    console.log('=== SINGLE-VERTEX HOVER EDIT MODE SETUP COMPLETE ===');
  }

  /**
   * Create an editable layer from the selected item's geometry
   * Used when the original source layer is no longer available (e.g., kecamatan layer cleared after drilldown)
   */
  private createEditableLayerFromSelectedItem(selectedItem: any): void {
    if (!this.map) return;

    console.log('📍 Creating editable layer from selected item:', selectedItem);

    // Hide all other layers for clean editing view
    const layersToHide = [
      this.kelurahanBoundariesLayer,
      this.blokBoundariesLayer,
      this.bidangBoundariesLayer
    ];

    (this as any)._hiddenLayers = [];

    layersToHide.forEach(layer => {
      if (layer && this.map?.hasLayer(layer)) {
        this.map.removeLayer(layer);
        (this as any)._hiddenLayers.push(layer);
      }
    });

    // Get geometry from selectedItem - it could be in different formats
    let geometry = selectedItem.geom || selectedItem.geometry;
    const id = selectedItem.kdKecamatan || selectedItem.kdKelurahan || selectedItem.kdBlok || selectedItem.id;

    if (!geometry) {
      console.error('❌ Selected item has no geometry');
      alert('Tidak ada geometry untuk diedit.');
      this.editMode = 'none';
      return;
    }

    // Create a GeoJSON layer for the selected item
    let geoJsonData: any;

    // Handle different geometry formats (WKB decoded, GeoJSON, etc)
    if (typeof geometry === 'object' && geometry.type) {
      // Already GeoJSON geometry
      geoJsonData = {
        type: 'Feature',
        properties: { id: id },
        geometry: geometry
      };
    } else if (typeof geometry === 'object' && geometry.coordinates) {
      // Has coordinates directly
      geoJsonData = {
        type: 'Feature',
        properties: { id: id },
        geometry: geometry
      };
    } else {
      console.error('❌ Unknown geometry format:', geometry);
      alert('Format geometry tidak dikenali.');
      this.editMode = 'none';
      return;
    }

    // Create temporary editable layer
    const editableLayer = L.geoJSON(geoJsonData, {
      style: {
        color: '#5c5c3d', // Olive border like legacy
        weight: 2,
        fillColor: '#8b7355', // Brown fill like legacy screenshot
        fillOpacity: 0.8
      }
    });

    editableLayer.addTo(this.map);

    // Store for cleanup later
    (this as any)._tempEditableLayer = editableLayer;
    (this as any)._editSourceLayer = editableLayer;

    // Enable Geoman editing on each layer in the GeoJSON
    editableLayer.eachLayer((layer: any) => {
      if (layer.pm) {
        layer.pm.enable({
          allowSelfIntersection: false,
          snappable: true
        });

        (layer as any)._editId = id;
        (layer as any)._editTarget = this.editTarget;

        // Listen for edits
        layer.on('pm:edit', (e: any) => {
          console.log(`📝 pm:edit fired for ${this.editTarget} id=${id}`);
          const editedGeoJson = e.target.toGeoJSON();

          const existingIdx = this.pendingChanges.findIndex(c => c.id === id);
          if (existingIdx >= 0) {
            this.pendingChanges[existingIdx].geom = editedGeoJson.geometry;
          } else {
            this.pendingChanges.push({
              id: id,
              geom: editedGeoJson.geometry,
              target: this.editTarget || 'kecamatan'
            });
          }
          console.log(`✅ Change tracked: ${this.editTarget} id=${id}`);
        });
      }
    });

    // Zoom to the editable polygon
    this.map.fitBounds(editableLayer.getBounds(), { padding: [20, 20] });

    console.log(`✅ Created editable layer for ${this.editTarget}: ${id}`);
  }

  /**
   * Setup move mode for dragging/moving entire bidang polygons (Geser Bidang)
   */
  private setupMoveMode(): void {
    if (!this.map || !this.bidangBoundariesLayer) {
      console.error('❌ setupMoveMode: No map or bidang layer');
      return;
    }

    console.log('🔄 Setting up move mode (Geser Bidang)...');

    let enabledCount = 0;

    // Enable dragging on each bidang polygon
    this.bidangBoundariesLayer.eachLayer((layer: any) => {
      if (layer.toGeoJSON && layer.pm) {
        const geoJson = layer.toGeoJSON();
        const props = geoJson.properties || {};
        const id = props.id || props.nop;

        if (!this.isValidGeometry(geoJson.geometry)) {
          return;
        }

        // Store ID for tracking
        (layer as any)._editId = id;
        (layer as any)._editTarget = 'bidang';

        // Apply move mode style (blue highlight)
        layer.setStyle({
          color: '#3b82f6',
          weight: 3,
          fillColor: '#93c5fd',
          fillOpacity: 0.6
        });

        // Enable Geoman drag mode on this layer
        layer.pm.enableLayerDrag();

        // Listen for drag end to track changes
        layer.on('pm:dragend', (e: any) => {
          const movedGeoJson = e.target.toGeoJSON();
          const existingIdx = this.pendingChanges.findIndex(c => c.id === id);

          if (existingIdx >= 0) {
            this.pendingChanges[existingIdx].geom = movedGeoJson.geometry;
          } else {
            this.pendingChanges.push({
              id: id,
              geom: movedGeoJson.geometry,
              target: 'bidang'
            });
          }

          console.log(`📍 Bidang ${id} moved, position saved`);
        });

        enabledCount++;
      }
    });

    console.log(`✅ Move mode enabled on ${enabledCount} bidang polygons`);
  }

  /**
   * Setup delete mode for removing polygons
   */
  private setupDeleteMode(): void {
    if (!this.map || !this.bidangBoundariesLayer) return;

    // Enable click to delete on bidang layer
    this.bidangBoundariesLayer.eachLayer((layer: any) => {
      layer.on('click', () => {
        const id = layer.feature?.properties?.id;
        if (id && confirm('Hapus bidang ini?')) {
          this.pendingChanges.push({ id, geom: null }); // null = delete
          this.bidangBoundariesLayer?.removeLayer(layer);
          console.log('🗑️ Polygon marked for deletion:', id);
        }
      });
    });

    console.log('🗑️ Delete mode enabled');
  }

  /**
   * Disable Geoman editing and restore original layer styles
   */
  private removeDrawControl(): void {
    console.log('=== EXITING EDIT MODE ===');

    // Disable Geoman draw mode (if in draw mode)
    if (this.map && (this.map as any).pm) {
      (this.map as any).pm.disableDraw();
      this.map.off('pm:create'); // Remove draw created listener
      console.log('✅ Disabled Geoman draw mode');
    }

    // Remove any newly drawn layers (on cancel)
    if (this.drawnLayers.length > 0 && this.map) {
      this.drawnLayers.forEach(layer => {
        if (this.map?.hasLayer(layer)) {
          this.map.removeLayer(layer);
        }
      });
      console.log(`✅ Removed ${this.drawnLayers.length} drawn layers`);
      this.drawnLayers = [];
    }

    // Get the source layer that was being edited
    const sourceLayer = (this as any)._editSourceLayer as L.GeoJSON | null;

    if (sourceLayer) {
      // Disable Geoman editing on each layer and restore original style
      sourceLayer.eachLayer((layer: any) => {
        // Disable Geoman editing
        if (layer.pm) {
          layer.pm.disable();
        }

        // Remove edit event listeners
        layer.off('pm:edit');

        // Restore full opacity for polygons that were hidden
        if (layer.setStyle) {
          layer.setStyle({ opacity: 1, fillOpacity: 0.4 });
        }
      });

      // Reset the style using layer's resetStyle function (if available)
      if (sourceLayer.resetStyle) {
        sourceLayer.eachLayer((layer: any) => {
          sourceLayer.resetStyle(layer);
        });
      }

      console.log(`✅ Disabled editing and restored styles for ${this.editTarget}`);
    }

    // RESTORE HIDDEN LAYERS (that were hidden during edit mode)
    const hiddenLayers = (this as any)._hiddenLayers as L.Layer[] | null;
    if (hiddenLayers && hiddenLayers.length > 0 && this.map) {
      hiddenLayers.forEach(layer => {
        if (layer && !this.map?.hasLayer(layer)) {
          this.map?.addLayer(layer);
        }
      });
      console.log(`✅ Restored ${hiddenLayers.length} hidden layers`);
    }

    // Legacy cleanup (for old leaflet-draw code if still present)
    if (this.drawControl && this.map) {
      this.map.removeControl(this.drawControl as L.Control);
      this.drawControl = null;
    }

    // Clear editable layer (legacy)
    if (this.editableLayer) {
      this.editableLayer.clearLayers();
      if (this.map && this.editableLayer) {
        this.map.removeLayer(this.editableLayer);
      }
    }

    // Clean up temporary editable layer (created by createEditableLayerFromSelectedItem)
    const tempLayer = (this as any)._tempEditableLayer as L.GeoJSON | null;
    if (tempLayer && this.map) {
      tempLayer.eachLayer((layer: any) => {
        // Disable Geoman editing if applicable
        if (layer.pm) layer.pm.disable();
        layer.off('pm:edit');

        // Disable SingleVertexEditor if applicable
        if (layer._singleVertexEditor) {
          (layer._singleVertexEditor as SingleVertexEditor).disable();
          layer._singleVertexEditor = null;
        }
      });
      this.map.removeLayer(tempLayer);
      (this as any)._tempEditableLayer = null;
      console.log('✅ Cleaned up temporary editable layer');
    }

    // If we were editing kecamatan while at kelurahan level, remove the kecamatan layer
    // (since user was viewing kelurahan, not all kecamatans)
    const wasEditingKecamatan = this.editTarget === 'kecamatan';
    if (wasEditingKecamatan && this.currentLevel === 'kelurahan') {
      if (this.kecamatanBoundariesLayer && this.map) {
        this.map.removeLayer(this.kecamatanBoundariesLayer);
        this.kecamatanBoundariesLayer = null;
        console.log('✅ Removed kecamatan layer (was editing at kelurahan level)');
      }
    }

    // Reset references
    this.editTarget = null;
    (this as any)._editSourceLayer = null;
    (this as any)._hiddenLayers = [];

    console.log('=== EDIT MODE EXITED ===');
  }

  /**
   * Save all pending changes to backend
   */
  saveEditChanges(): void {
    if (this.pendingChanges.length === 0) {
      console.log('No changes to save');
      return;
    }

    console.log(`💾 Saving ${this.pendingChanges.length} changes...`);

    // Group changes by target type
    const changesByTarget: { [key: string]: any[] } = {};

    this.pendingChanges.forEach(change => {
      const target = change.target || this.editTarget || 'bidang'; // Default to bidang if unknown
      if (!changesByTarget[target]) {
        changesByTarget[target] = [];
      }

      // Convert geometry to format expected by backend
      changesByTarget[target].push({
        id: change.id,
        geom: change.geom // GeoJSON geometry
      });
    });

    const tasks: Observable<any>[] = [];

    // Create API requests for each target group
    Object.keys(changesByTarget).forEach(target => {
      const payload = { geometry: changesByTarget[target] };

      switch (target) {
        case 'kecamatan':
          tasks.push(this.bprdApiService.updateKecamatan(payload));
          break;
        case 'kelurahan':
          tasks.push(this.bprdApiService.updateKelurahan(payload));
          break;
        case 'blok':
          tasks.push(this.bprdApiService.updateBlok(payload));
          break;
        case 'bidang':
          tasks.push(this.bprdApiService.updateBidang(payload));
          break;
      }
    });

    if (tasks.length === 0) {
      console.warn('No valid tasks created');
      return;
    }

    // Execute all save requests
    forkJoin(tasks).subscribe({
      next: (results) => {
        console.log('✅ All changes saved successfully', results);
        alert('Perubahan berhasil disimpan!');

        // Clear updates
        this.pendingChanges = [];
        this.toggleEditMode('none');

        // Reload current view to reflect changes
        this.reloadCurrentView();
      },
      error: (err) => {
        console.error('❌ Failed to save changes:', err);
        alert('Gagal menyimpan perubahan. Silakan coba lagi.');
      }
    });
  }

  /**
   * Cancel edit mode and discard changes
   */
  cancelEditMode(): void {
    if (this.pendingChanges.length > 0) {
      if (!confirm('Batalkan perubahan? Perubahan yang belum disimpan akan hilang.')) {
        return;
      }
    }

    this.editMode = 'none';
    this.pendingChanges = [];
    this.removeDrawControl();
    console.log('❌ Edit mode cancelled');
  }

  /**
   * Reload the current view data after edits
   */
  private reloadCurrentView(): void {
    if (this.currentLevel === 'kecamatan') {
      window.location.reload();
    } else if (this.currentLevel === 'kelurahan' && this.selectedKecamatanForDrilldown) {
      this.loadKelurahanBoundariesWithCount(
        this.selectedKecamatanForDrilldown.kdKec,
        this.selectedKecamatanForDrilldown.nama
      );
    } else if (this.currentLevel === 'blok' && this.selectedKelurahanForDrilldown) {
      this.loadBlokBoundaries(
        this.selectedKelurahanForDrilldown.kdKec,
        this.selectedKelurahanForDrilldown.kdKel,
        this.selectedKelurahanForDrilldown.nama,
        null
      );
    } else if (this.currentLevel === 'bidang' && this.selectedBlokForDrilldown) {
      this.loadBidangBoundaries(
        this.selectedBlokForDrilldown.kdKec,
        this.selectedBlokForDrilldown.kdKel,
        this.selectedBlokForDrilldown.kdBlok,
        null
      );
    }
  }

  /**
   * Validate GeoJSON geometry has no null coordinates
   * Leaflet-Draw crashes if any coordinate is null/undefined
   */
  private isValidGeometry(geometry: any): boolean {
    if (!geometry || !geometry.type || !geometry.coordinates) {
      return false;
    }

    // Recursively check all coordinates
    const validateCoords = (coords: any): boolean => {
      if (coords === null || coords === undefined) {
        return false;
      }

      if (typeof coords === 'number') {
        return !isNaN(coords) && isFinite(coords);
      }

      if (Array.isArray(coords)) {
        return coords.every(c => validateCoords(c));
      }

      return false;
    };

    return validateCoords(geometry.coordinates);
  }
}
