import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RestApiService } from '../../../core/services/rest-api.service';
import * as L from 'leaflet';

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

  // Objek Pajak data
  objekPajakData: any[] = [];
  selectedObjekPajak: any = null;
  isLoadingObjekPajak = false;
  showObjekPajakModal = false;

  constructor(private restApiService: RestApiService) { }

  ngOnInit(): void {
    // Load kecamatan data on init
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
      this.map.remove();
    }
  }

  private initMap(): void {
    if (this.mapContainer && !this.map) {
      try {
        // Basic Leaflet map initialization
        this.map = L.map(this.mapContainer.nativeElement, {
          center: [-7.250445, 112.768845],
          zoom: 10
        });

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(this.map);

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
   * Load kecamatan data from API
   */
  loadKecamatanData(): void {
    this.isLoadingKecamatan = true;
    this.restApiService.getRefKecamatan().subscribe({
      next: (response) => {
        console.log('Kecamatan response:', response);
        this.kecamatanList = response;
        this.isLoadingKecamatan = false;
        console.log('Kecamatan list loaded:', this.kecamatanList.length, 'items');
      },
      error: (error) => {
        console.error('Error loading kecamatan data:', error);
        this.isLoadingKecamatan = false;
      }
    });
  }

  /**
   * Load kelurahan data based on selected kecamatan
   */
  loadKelurahanData(): void {
    if (!this.selectedKecamatan) {
      this.kelurahanList = [];
      return;
    }

    this.isLoadingKelurahan = true;
    this.restApiService.getRefKelurahanByKecamatan(
      this.selectedKecamatan.kdPropinsi,
      this.selectedKecamatan.kdDati2,
      this.selectedKecamatan.kdKecamatan
    ).subscribe({
      next: (response) => {
        console.log('Kelurahan response:', response);
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

        // Add hover tooltip with quick details
        const tooltipContent = `
          <div class="bidang-tooltip">
            <div class="tooltip-header">
              <i class="ri-map-pin-line me-1"></i>
              <strong>Bidang ${props.kd_blok || 'N/A'}</strong>
            </div>
            <div class="tooltip-body">
              <div class="tooltip-row">
                <span class="tooltip-label">Sequence:</span>
                <span class="tooltip-value">${props.no_urut || 'N/A'}</span>
              </div>
              <div class="tooltip-row">
                <span class="tooltip-label">NOP:</span>
                <span class="tooltip-value">${props.nop || 'N/A'}</span>
              </div>
            </div>
            <div class="tooltip-footer">
              <small class="text-muted">Klik untuk detail lengkap</small>
            </div>
          </div>
        `;

        layer.bindTooltip(tooltipContent, {
          direction: 'top',
          offset: [0, -10],
          opacity: 0.95,
          className: 'bidang-tooltip-container'
        });

        // Add click handler to fetch objek pajak data and show modal directly
        layer.on('click', (e) => {
          // Close any existing tooltip
          layer.closeTooltip();

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

    // Fit map to show all features
    if (this.geoJsonData.length > 0) {
      this.map.fitBounds(this.geoJsonLayer.getBounds());
    }
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
    }
  }

  /**
   * Clear map data
   */
  clearMap(): void {
    if (this.map && this.geoJsonLayer) {
      this.map.removeLayer(this.geoJsonLayer);
      this.geoJsonLayer = null;
    }
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
}
