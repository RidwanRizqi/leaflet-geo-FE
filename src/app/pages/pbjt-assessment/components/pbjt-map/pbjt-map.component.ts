import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';
import { PbjtAssessmentService } from '../../services/pbjt-assessment.service';
import { BprdApiService } from '../../../../core/services/bprd-api.service';

interface KecamatanStats {
  kecamatan: string;
  jumlahUsaha: number;
  totalAnnualPbjt: number;
  avgConfidenceScore: number;
  businessTypes: { [key: string]: number };
}

interface KelurahanStats {
  kelurahan: string;
  kecamatan: string;
  jumlahUsaha: number;
  totalAnnualPbjt: number;
  avgConfidenceScore: number;
  businessTypes: { [key: string]: number };
}

@Component({
  selector: 'app-pbjt-map',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pbjt-map.component.html',
  styleUrls: ['./pbjt-map.component.scss']
})
export class PbjtMapComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef;

  private map: L.Map | null = null;
  private kecamatanLayer: L.GeoJSON | null = null;
  private kelurahanLayer: L.GeoJSON | null = null;
  private markersLayer: L.LayerGroup | null = null;

  // Data properties
  kecamatanStats: KecamatanStats[] = [];
  kelurahanStats: KelurahanStats[] = [];
  assessments: any[] = [];

  // UI State
  isLoadingStats = false;
  isLoadingBoundaries = false;
  currentLevel: 'kecamatan' | 'kelurahan' | 'detail' = 'kecamatan';
  selectedKecamatan: string | null = null;
  selectedKdKec: string | null = null;
  selectedKelurahan: string | null = null;
  errorMessage = '';

  // Stats summary
  totalUsaha = 0;
  totalPbjt = 0;
  avgConfidence = 0;

  constructor(
    private pbjtService: PbjtAssessmentService,
    private bprdApiService: BprdApiService
  ) { }

  ngOnInit(): void {
    this.loadKecamatanStats();
  }

  ngAfterViewInit(): void {
    this.initializeMap();
    setTimeout(() => {
      this.loadKecamatanBoundaries();
    }, 500);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  /**
   * Initialize Leaflet map
   */
  initializeMap(): void {
    if (this.map) {
      return;
    }

    try {
      this.map = L.map(this.mapContainer.nativeElement, {
        center: [-8.1335, 113.2167],
        zoom: 11,
        zoomControl: true
      });

      const baseLayers = {
        'Google Satellite': L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '© Google Maps'
        }),
        'Google Streets': L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          attribution: '© Google Maps'
        }),
        'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap contributors'
        })
      };

      baseLayers['Google Satellite'].addTo(this.map);
      L.control.layers(baseLayers).addTo(this.map);

      this.markersLayer = L.layerGroup().addTo(this.map);

      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Error initializing map:', error);
      this.errorMessage = 'Failed to initialize map';
    }
  }

  /**
   * Load kecamatan statistics from PBJT API
   */
  loadKecamatanStats(): void {
    this.isLoadingStats = true;
    this.pbjtService.getStatsByKecamatan().subscribe({
      next: (stats) => {
        this.kecamatanStats = stats;
        this.calculateTotalStats();
        this.isLoadingStats = false;
        console.log('Kecamatan stats loaded:', stats);
      },
      error: (error) => {
        console.error('Error loading kecamatan stats:', error);
        this.errorMessage = 'Failed to load statistics';
        this.isLoadingStats = false;
      }
    });
  }

  /**
   * Load kecamatan boundaries from BPRD API
   */
  loadKecamatanBoundaries(): void {
    if (!this.map) return;

    this.isLoadingBoundaries = true;
    this.bprdApiService.getBoundariesViaBackend().subscribe({
      next: (boundaries: any[]) => {
        console.log('Kecamatan boundaries loaded:', boundaries.length);
        this.renderKecamatanLayer(boundaries);
        this.isLoadingBoundaries = false;
      },
      error: (error: any) => {
        console.error('Error loading kecamatan boundaries:', error);
        this.errorMessage = 'Failed to load map boundaries';
        this.isLoadingBoundaries = false;
      }
    });
  }

  /**
   * Render kecamatan boundaries on map
   */
  renderKecamatanLayer(boundaries: any[]): void {
    if (!this.map) return;

    console.log('🔄 Rendering kecamatan layer with', boundaries.length, 'boundaries');

    // Remove existing layer
    if (this.kecamatanLayer) {
      this.map.removeLayer(this.kecamatanLayer);
    }

    // Create layer with styling
    this.kecamatanLayer = L.geoJSON([], {
      style: (feature) => this.getKecamatanStyle(feature),
      onEachFeature: (feature, layer) => this.onEachKecamatan(feature, layer)
    });

    // Process each boundary using same method as bidang-map
    let processedCount = 0;
    boundaries
      .filter(boundary => boundary.is_active)
      .forEach((boundary, index) => {
        try {
          console.log(`🔄 Processing boundary ${index + 1}/${boundaries.length}:`, boundary.nama);

          // Convert BPRD boundary to GeoJSON feature
          const geoJsonFeature = this.convertBprdGeomToGeoJSON(boundary);
          if (geoJsonFeature && geoJsonFeature.geometry) {
            // Add PBJT statistics to properties
            const kecamatanName = geoJsonFeature.properties.nama || geoJsonFeature.properties.kecamatan;
            const stats = this.kecamatanStats.find(s =>
              s.kecamatan.toLowerCase() === kecamatanName.toLowerCase()
            );

            // Always set properties, even if no stats (show 0 for kecamatan without usaha)
            geoJsonFeature.properties.kecamatan = kecamatanName;
            geoJsonFeature.properties.jumlahUsaha = stats?.jumlahUsaha || 0;
            geoJsonFeature.properties.totalPbjt = stats?.totalAnnualPbjt || 0;
            geoJsonFeature.properties.avgConfidence = stats?.avgConfidenceScore || 0;

            console.log(`✅ Successfully converted ${kecamatanName}:`, geoJsonFeature);
            this.kecamatanLayer?.addData(geoJsonFeature);
            processedCount++;
          } else {
            console.warn(`⚠️ Empty geometry for ${boundary.nama}`);
          }
        } catch (error) {
          console.error(`❌ Failed to process boundary for ${boundary.nama}:`, error);
        }
      });

    console.log(`📊 Processing complete: ${processedCount}/${boundaries.length} boundaries added`);

    if (this.map && this.kecamatanLayer && processedCount > 0) {
      this.kecamatanLayer.addTo(this.map);
      console.log('✅ Kecamatan boundaries layer added to map');

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
  }

  /**
   * Get style for kecamatan polygon based on usaha count
   */
  getKecamatanStyle(feature: any): L.PathOptions {
    const jumlahUsaha = feature?.properties?.jumlahUsaha || 0;

    let fillColor = '#cccccc';
    if (jumlahUsaha > 10) fillColor = '#006d2c';
    else if (jumlahUsaha > 5) fillColor = '#31a354';
    else if (jumlahUsaha > 2) fillColor = '#74c476';
    else if (jumlahUsaha > 0) fillColor = '#bae4b3';

    return {
      fillColor: fillColor,
      weight: 2,
      opacity: 1,
      color: '#666',
      fillOpacity: 0.6
    };
  }

  /**
   * Attach events to kecamatan features
   */
  onEachKecamatan(feature: any, layer: L.Layer): void {
    const props = feature.properties;

    // Add permanent label (tooltip) in the center of polygon
    const labelHtml = `
      <div style="text-align: center;">
        <div style="font-weight: bold; margin-bottom: 2px;">${props.kecamatan}</div>
        <div style="font-size: 10px; opacity: 0.9;">${props.jumlahUsaha.toLocaleString('id-ID')} Usaha</div>
      </div>
    `;

    layer.bindTooltip(labelHtml, {
      permanent: true,
      direction: 'center',
      className: 'kecamatan-label',
      opacity: 0.9
    });

    const popupContent = `
      <div class="pbjt-popup">
        <h6><strong>${props.kecamatan}</strong></h6>
        <hr style="margin: 8px 0;">
        <div><strong>Jumlah Usaha:</strong> ${props.jumlahUsaha}</div>
        <div><strong>Total PBJT:</strong> Rp ${this.formatCurrency(props.totalPbjt)}</div>
        <div><strong>Avg Confidence:</strong> ${props.avgConfidence?.toFixed(1) || 0}</div>
        <div style="margin-top: 8px; color: #0066cc; cursor: pointer;">
          <small>Klik untuk detail →</small>
        </div>
      </div>
    `;

    layer.bindPopup(popupContent);

    layer.on({
      mouseover: (e) => this.highlightFeature(e),
      mouseout: (e) => this.resetHighlight(e),
      click: (e) => {
        L.DomEvent.stopPropagation(e);
        this.onKecamatanClick(props.kecamatan, props.kd_kec);
      }
    });
  }

  /**
   * Highlight feature on hover
   */
  highlightFeature(e: L.LeafletMouseEvent): void {
    const layer = e.target;
    layer.setStyle({
      weight: 4,
      color: '#fff',
      fillOpacity: 0.8
    });
    layer.bringToFront();
  }

  /**
   * Reset highlight
   */
  resetHighlight(e: L.LeafletMouseEvent): void {
    if (this.kecamatanLayer) {
      this.kecamatanLayer.resetStyle(e.target);
    }
  }

  /**
   * Handle kecamatan click - drill down to kelurahan
   */
  onKecamatanClick(kecamatan: string, kdKec: string): void {
    console.log(`🔍 Kecamatan clicked: ${kecamatan} (${kdKec})`);
    this.selectedKecamatan = kecamatan;
    this.selectedKdKec = kdKec;
    this.currentLevel = 'kelurahan';
    this.loadKelurahanStats(kecamatan);
    this.loadKelurahanBoundaries(kdKec);
  }

  /**
   * Load kelurahan statistics for selected kecamatan
   */
  loadKelurahanStats(kecamatan: string): void {
    this.isLoadingStats = true;
    this.pbjtService.getStatsByKelurahan(kecamatan).subscribe({
      next: (stats) => {
        this.kelurahanStats = stats;
        this.isLoadingStats = false;
        console.log('Kelurahan stats loaded:', stats);
      },
      error: (error) => {
        console.error('Error loading kelurahan stats:', error);
        this.isLoadingStats = false;
      }
    });
  }

  /**
   * Load kelurahan boundaries
   */
  loadKelurahanBoundaries(kdKec: string): void {
    if (!this.map) return;

    console.log('🌐 Loading kelurahan boundaries for kd_kec:', kdKec);
    this.isLoadingBoundaries = true;
    this.bprdApiService.getKelurahanBoundariesViaBackend(kdKec).subscribe({
      next: (boundaries: any[]) => {
        console.log('Kelurahan boundaries loaded:', boundaries.length);
        this.renderKelurahanLayer(boundaries);
        this.isLoadingBoundaries = false;
      },
      error: (error: any) => {
        console.error('Error loading kelurahan boundaries:', error);
        this.isLoadingBoundaries = false;
      }
    });
  }

  /**
   * Render kelurahan layer
   */
  renderKelurahanLayer(boundaries: any[]): void {
    if (!this.map) return;

    console.log('🔄 Rendering kelurahan layer with', boundaries.length, 'boundaries');

    // Remove kecamatan layer
    if (this.kecamatanLayer) {
      this.map.removeLayer(this.kecamatanLayer);
      this.kecamatanLayer = null;
    }

    // Remove existing kelurahan layer
    if (this.kelurahanLayer) {
      this.map.removeLayer(this.kelurahanLayer);
    }

    // Create layer with styling
    this.kelurahanLayer = L.geoJSON([], {
      style: (feature) => this.getKecamatanStyle(feature),
      onEachFeature: (feature, layer) => this.onEachKelurahan(feature, layer)
    });

    // Process each boundary using same method as bidang-map
    let processedCount = 0;
    boundaries
      .filter(boundary => boundary.is_active)
      .forEach((boundary, index) => {
        try {
          console.log(`🔄 Processing kelurahan boundary ${index + 1}/${boundaries.length}:`, boundary.nama);

          // Convert BPRD boundary to GeoJSON feature
          const geoJsonFeature = this.convertBprdGeomToGeoJSON(boundary);
          if (geoJsonFeature && geoJsonFeature.geometry) {
            // Add PBJT statistics to properties
            const kelurahanName = geoJsonFeature.properties.nama || geoJsonFeature.properties.kelurahan;
            const stats = this.kelurahanStats.find(s =>
              s.kelurahan.toLowerCase() === kelurahanName.toLowerCase()
            );

            // Always set properties, even if no stats (show 0 for kelurahan without usaha)
            geoJsonFeature.properties.kecamatan = this.selectedKecamatan;
            geoJsonFeature.properties.kelurahan = kelurahanName;
            geoJsonFeature.properties.jumlahUsaha = stats?.jumlahUsaha || 0;
            geoJsonFeature.properties.totalPbjt = stats?.totalAnnualPbjt || 0;
            geoJsonFeature.properties.avgConfidence = stats?.avgConfidenceScore || 0;

            console.log(`✅ Successfully converted ${kelurahanName}:`, geoJsonFeature);
            this.kelurahanLayer?.addData(geoJsonFeature);
            processedCount++;
          } else {
            console.warn(`⚠️ Empty geometry for ${boundary.nama}`);
          }
        } catch (error) {
          console.error(`❌ Failed to process boundary for ${boundary.nama}:`, error);
        }
      });

    console.log(`📊 Processing complete: ${processedCount}/${boundaries.length} kelurahan boundaries added`);

    if (this.map && this.kelurahanLayer && processedCount > 0) {
      this.kelurahanLayer.addTo(this.map);
      console.log('✅ Kelurahan boundaries layer added to map');

      // Zoom into selected kecamatan area
      if (this.kelurahanLayer.getBounds().isValid()) {
        this.map.fitBounds(this.kelurahanLayer.getBounds(), { padding: [50, 50] });
      }
    }
  }

  /**
   * Attach events to kelurahan features
   */
  onEachKelurahan(feature: any, layer: L.Layer): void {
    const props = feature.properties;

    // Add permanent label (tooltip) in the center of polygon
    const labelHtml = `
      <div style="text-align: center;">
        <div style="font-weight: bold; margin-bottom: 2px;">${props.kelurahan}</div>
        <div style="font-size: 10px; opacity: 0.9;">${props.jumlahUsaha.toLocaleString('id-ID')} Usaha</div>
      </div>
    `;

    layer.bindTooltip(labelHtml, {
      permanent: true,
      direction: 'center',
      className: 'kelurahan-label',
      opacity: 0.9
    });

    const popupContent = `
      <div class="pbjt-popup">
        <h6><strong>${props.kelurahan}</strong></h6>
        <small style="color: #666;">${props.kecamatan}</small>
        <hr style="margin: 8px 0;">
        <div><strong>Jumlah Usaha:</strong> ${props.jumlahUsaha}</div>
        <div><strong>Total PBJT:</strong> Rp ${this.formatCurrency(props.totalPbjt)}</div>
        <div><strong>Avg Confidence:</strong> ${props.avgConfidence?.toFixed(1) || 0}</div>
        <div style="margin-top: 8px; color: #0066cc; cursor: pointer;">
          <small>Klik untuk lihat usaha →</small>
        </div>
      </div>
    `;

    layer.bindPopup(popupContent);

    layer.on({
      mouseover: (e) => this.highlightFeature(e),
      mouseout: (e) => {
        if (this.kelurahanLayer) {
          this.kelurahanLayer.resetStyle(e.target);
        }
      },
      click: (e) => this.onKelurahanClick(props.kecamatan, props.kelurahan)
    });
  }

  /**
   * Handle kelurahan click - show business markers
   */
  onKelurahanClick(kecamatan: string, kelurahan: string): void {
    console.log('Kelurahan clicked:', kelurahan);
    this.selectedKelurahan = kelurahan;
    this.currentLevel = 'detail';
    this.loadBusinessMarkers(kecamatan, kelurahan);
  }

  /**
   * Load and display business markers with realization data
   */
  loadBusinessMarkers(kecamatan: string, kelurahan: string): void {
    // Use the new API that includes realization data from SIMATDA
    this.pbjtService.getAssessmentsByLocationWithRealization(kecamatan, kelurahan).subscribe({
      next: (assessments) => {
        this.assessments = assessments;
        this.renderBusinessMarkers(assessments);
        console.log('Business assessments with realization loaded:', assessments.length);
      },
      error: (error) => {
        console.error('Error loading business markers:', error);
        // Fallback to regular API if realization API fails
        this.pbjtService.getAssessmentsByLocation(kecamatan, kelurahan).subscribe({
          next: (assessments) => {
            this.assessments = assessments;
            this.renderBusinessMarkers(assessments);
          },
          error: (err) => console.error('Fallback also failed:', err)
        });
      }
    });
  }

  /**
   * Render business location markers
   */
  renderBusinessMarkers(assessments: any[]): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();

    assessments.forEach(assessment => {
      if (assessment.latitude && assessment.longitude) {
        // Create custom marker icon with a red dot
        const icon = L.divIcon({
          className: 'pbjt-marker',
          html: `
            <div style="
              width: 24px;
              height: 24px;
              background-color: #ff4757;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <div style="
                width: 8px;
                height: 8px;
                background-color: white;
                border-radius: 50%;
              "></div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -12]
        });

        const marker = L.marker([assessment.latitude, assessment.longitude], { icon });

        const popupContent = `
          <div class="pbjt-popup" style="min-width: 280px;">
            <h6 style="margin-bottom: 4px;"><strong>${assessment.businessName}</strong></h6>
            <small style="color: #666;">${this.getBusinessTypeLabel(assessment.businessType)}</small>
            <hr style="margin: 8px 0;">
            <div><strong>NOP:</strong> ${assessment.taxObjectNumber || '-'}</div>
            <div><strong>Business ID:</strong> ${assessment.businessId}</div>
            <div><strong>Address:</strong> ${assessment.address || '-'}</div>
            <div><strong>Location:</strong> ${assessment.kelurahan}, ${assessment.kecamatan}</div>
            <hr style="margin: 8px 0;">
            <div style="font-weight: bold; margin-bottom: 4px;">📊 Realisasi PBJT:</div>
            <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
              <tr style="background: #f5f5f5;">
                <td style="padding: 3px; border: 1px solid #ddd;">2021</td>
                <td style="padding: 3px; border: 1px solid #ddd;">2022</td>
                <td style="padding: 3px; border: 1px solid #ddd;">2023</td>
                <td style="padding: 3px; border: 1px solid #ddd;">2024</td>
                <td style="padding: 3px; border: 1px solid #ddd;">2025</td>
              </tr>
              <tr>
                <td style="padding: 3px; border: 1px solid #ddd; text-align: right;">${this.formatCurrencyShort(assessment.realisasi2021)}</td>
                <td style="padding: 3px; border: 1px solid #ddd; text-align: right;">${this.formatCurrencyShort(assessment.realisasi2022)}</td>
                <td style="padding: 3px; border: 1px solid #ddd; text-align: right;">${this.formatCurrencyShort(assessment.realisasi2023)}</td>
                <td style="padding: 3px; border: 1px solid #ddd; text-align: right;">${this.formatCurrencyShort(assessment.realisasi2024)}</td>
                <td style="padding: 3px; border: 1px solid #ddd; text-align: right;">${this.formatCurrencyShort(assessment.realisasi2025)}</td>
              </tr>
            </table>
            <div style="margin-top: 6px; font-weight: bold; color: #28a745;">Total: Rp ${this.formatCurrency(assessment.totalRealisasi)}</div>
          </div>
        `;

        marker.bindPopup(popupContent);
        marker.addTo(this.markersLayer!);
      }
    });
  }

  /**
   * Navigate back to previous level
   */
  goBack(): void {
    if (this.currentLevel === 'detail') {
      this.currentLevel = 'kelurahan';
      if (this.markersLayer) {
        this.markersLayer.clearLayers();
      }
    } else if (this.currentLevel === 'kelurahan') {
      this.currentLevel = 'kecamatan';
      this.selectedKecamatan = null;
      this.selectedKelurahan = null;
      if (this.kelurahanLayer && this.map) {
        this.map.removeLayer(this.kelurahanLayer);
        this.kelurahanLayer = null;
      }
      if (this.markersLayer) {
        this.markersLayer.clearLayers();
      }
      this.loadKecamatanBoundaries();
    }
  }

  /**
   * Convert BPRD boundary data to GeoJSON feature
   * Backend already converts WKB to GeoJSON, so we just need to create Feature object
   */
  private convertBprdGeomToGeoJSON(boundary: any): any {
    try {
      console.log('🔄 Converting BPRD boundary for:', boundary.nama);

      // Backend already provides geojson field with proper GeoJSON geometry
      if (boundary.geojson && typeof boundary.geojson === 'object') {
        const geom = boundary.geojson as any;

        // Validate that it's a proper GeoJSON geometry
        if (geom.type && geom.coordinates) {
          console.log(`✅ Valid GeoJSON for ${boundary.nama}: type=${geom.type}`);

          // Build properties - include all relevant fields
          const properties: any = {
            id: boundary.id,
            is_active: boundary.is_active
          };

          // Copy properties from geojson.properties if they exist
          if (geom.properties && typeof geom.properties === 'object') {
            Object.assign(properties, geom.properties);
          }

          // Add kd_kec (common to all)
          if (boundary.kd_kec) properties.kd_kec = boundary.kd_kec;

          // Add kd_kel (for kelurahan)
          if (boundary.kd_kel) properties.kd_kel = boundary.kd_kel;

          // Add nama (for kecamatan and kelurahan)
          if (boundary.nama) properties.nama = boundary.nama;

          // Add color (for kecamatan)
          if (boundary.color) properties.color = boundary.color;

          return {
            type: 'Feature',
            properties: properties,
            geometry: {
              type: geom.type,
              coordinates: geom.coordinates
            }
          };
        } else {
          console.warn(`⚠️ Invalid GeoJSON structure for ${boundary.nama}:`, geom);
        }
      } else {
        console.warn(`⚠️ No geojson field for ${boundary.nama}`);
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to convert geometry:`, error);
      return null;
    }
  }

  /**
   * Calculate total statistics
   */
  calculateTotalStats(): void {
    this.totalUsaha = this.kecamatanStats.reduce((sum, s) => sum + s.jumlahUsaha, 0);
    this.totalPbjt = this.kecamatanStats.reduce((sum, s) => sum + s.totalAnnualPbjt, 0);
    const totalConfidence = this.kecamatanStats.reduce((sum, s) => sum + (s.avgConfidenceScore * s.jumlahUsaha), 0);
    this.avgConfidence = this.totalUsaha > 0 ? totalConfidence / this.totalUsaha : 0;
  }

  /**
   * Format currency
   */
  formatCurrency(value: number): string {
    if (!value) return '0';
    return value.toLocaleString('id-ID');
  }

  /**
   * Get business type label
   */
  getBusinessTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'WARUNG_KECIL': 'Warung Kecil',
      'WARUNG_SEDANG': 'Warung Sedang',
      'RUMAH_MAKAN': 'Rumah Makan',
      'RESTAURANT': 'Restaurant',
      'CAFE_MODERN': 'Café Modern',
      'FRANCHISE': 'Franchise'
    };
    return labels[type] || type;
  }

  /**
   * Get confidence badge color
   */
  getConfidenceBadgeColor(level: string): string {
    switch (level) {
      case 'HIGH': return 'success';
      case 'MEDIUM': return 'warning';
      case 'LOW': return 'danger';
      default: return 'secondary';
    }
  }

  /**
   * Format currency in short format (millions/billions)
   */
  formatCurrencyShort(value: number): string {
    if (!value || value === 0) return '0';
    if (value >= 1000000000) {
      return (value / 1000000000).toFixed(1) + 'M';
    } else if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'Jt';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(0) + 'Rb';
    }
    return value.toString();
  }
}
