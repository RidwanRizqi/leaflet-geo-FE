import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { RestApiService } from '../../../core/services/rest-api.service';
import { BprdApiService, KecamatanBoundary, BlokBoundary, BidangBoundary } from '../../../core/services/bprd-api.service';
import * as L from 'leaflet';

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
  templateUrl: './thematic-map.component.html',
  styleUrls: ['./thematic-map.component.scss']
})
export class ThematicMapComponent implements OnInit, AfterViewInit, OnDestroy {

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

  // Boundary data
  kecamatanBoundariesLayer: L.GeoJSON | null = null;
  kelurahanBoundariesLayer: L.GeoJSON | null = null;
  blokBoundariesLayer: L.GeoJSON | null = null;
  bidangBoundariesLayer: L.GeoJSON | null = null;
  bprdKecamatanData: KecamatanBoundary[] = [];
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
          zoom: 11
        });

      // Define base layers
      const baseLayers = {
        'Google Satellite': L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '© Google Maps'
        }),
        'Google Hybrid': L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '© Google Maps'
        }),
        'Google Streets': L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '© Google Maps'
        }),
        'Google Terrain': L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '© Google Maps'
        }),
        'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        })
      };

      // Add default layer (Google Satellite)
      baseLayers['Google Satellite'].addTo(this.map);

      // Add layer control
      L.control.layers(baseLayers).addTo(this.map);

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
                click: (e) => {
                  // Single click kelurahan: Load blok boundaries
                  L.DomEvent.stopPropagation(e); // Prevent zoom

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
    if (this.kelurahanBoundariesLayer && this.map) {
      this.map.removeLayer(this.kelurahanBoundariesLayer);
      this.kelurahanBoundariesLayer = null;
    }

    // Reset navigation state
    this.selectedKecamatanForDrilldown = null;
    this.currentLevel = 'kecamatan';
    this.navigationStack = [];

    // Restore kecamatan labels (no API call)
    this.showKecamatanLabels = true;
    this.recreateKecamatanLayerFromCache();

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
        }          const boundaries = results.boundaries;
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

            // Hide kecamatan labels temporarily
            const wasShowingLabels = this.showKecamatanLabels;
            if (wasShowingLabels) {
              this.showKecamatanLabels = false;
              if (this.kecamatanBoundariesLayer && this.map) {
                this.map.removeLayer(this.kecamatanBoundariesLayer);
                this.kecamatanBoundariesLayer = null;
                this.recreateKecamatanLayerFromCache();
              }
            }

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
                  click: (e) => {
                    L.DomEvent.stopPropagation(e);
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

    console.log(`🏗️ Loading blok boundaries for ${kelurahanName} (${kdKec}/${kdKel})`);

    // Show loading indicator
    const loadingPopup = L.popup()
      .setLatLng(kelurahanLayer.getBounds().getCenter())
      .setContent('<div style="text-align: center;"><i class="ri-loader-line spin"></i> Loading blok boundaries...</div>')
      .openOn(this.map);

    this.bprdApiService.getBlokBoundariesViaBackend(kdKec, kdKel).subscribe({
      next: (blokBoundaries) => {
        // Close loading popup
        this.map?.closePopup(loadingPopup);

        console.log(`📡 Received ${blokBoundaries.length} blok boundaries for ${kelurahanName}`);

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

              // Add label for blok
              layer.bindTooltip(kdBlok, {
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
                click: (e) => {
                  // Single click blok: Load bidang boundaries
                  L.DomEvent.stopPropagation(e); // Prevent zoom

                  const kdKec = props.kd_kec;
                  const kdKel = props.kd_kel;
                  const kdBlok = props.kd_blok;

                  console.log(`📦 Clicked blok: ${kdBlok} (${kdKec}/${kdKel}/${kdBlok})`);
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

            // Add to map
            this.blokBoundariesLayer.addTo(this.map);

            console.log(`✅ Blok boundaries displayed for ${kelurahanName}`);

            // Dim the kelurahan layer
            if (kelurahanLayer) {
              kelurahanLayer.setStyle({
                opacity: 0.3,
                fillOpacity: 0.1
              });
            }
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

        console.error('❌ Error loading blok boundaries:', error);
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
                click: (e) => {
                  // Single click: Show bidang detail modal
                  L.DomEvent.stopPropagation(e);

                  console.log(`🔍 Clicked bidang: ${nop} (no_urut: ${noUrut})`);
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

            // Add to map
            this.bidangBoundariesLayer.addTo(this.map);

            console.log(`✅ Bidang boundaries displayed for blok ${kdBlok}`);

            // Dim the blok layer
            if (blokLayer) {
              blokLayer.setStyle({
                opacity: 0.3,
                fillOpacity: 0.1
              });
            }
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
    if (this.blokBoundariesLayer && this.map) {
      this.map.removeLayer(this.blokBoundariesLayer);
      this.blokBoundariesLayer = null;
    }

    // Restore kelurahan layer style
    if (this.kelurahanBoundariesLayer) {
      this.kelurahanBoundariesLayer.resetStyle();
    }

    // Reset navigation state
    this.selectedKelurahanForDrilldown = null;
    this.currentLevel = 'kelurahan';

    console.log('🔙 Returned to kelurahan view');
  }

  /**
   * Clear bidang drill-down and return to blok view
   */
  clearBidangView(): void {
    if (this.bidangBoundariesLayer && this.map) {
      this.map.removeLayer(this.bidangBoundariesLayer);
      this.bidangBoundariesLayer = null;
    }

    // Restore blok layer style
    if (this.blokBoundariesLayer) {
      this.blokBoundariesLayer.resetStyle();
    }

    // Reset navigation state
    this.selectedBlokForDrilldown = null;
    this.currentLevel = 'blok';

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
}
