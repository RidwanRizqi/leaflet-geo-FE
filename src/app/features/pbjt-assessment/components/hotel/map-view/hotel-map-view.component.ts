import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AccommodationService } from '../../../services/accommodation.service';
import { HttpClient } from '@angular/common/http';
import { Accommodation, AccommodationType, AccommodationTypeMetadata } from '../../../models/accommodation.model';
import * as L from 'leaflet';
import 'leaflet.markercluster';

const API_BASE = 'http://localhost:8080/api';

interface KecamatanBoundary {
  id: string;
  kd_kec: string;
  nama: string;
  color: string;
  geojson: any;
  is_active: boolean;
}

interface KelurahanBoundary {
  id: string;
  kd_kec: string;
  kd_kel: string;
  nama: string;
  geojson: any;
  is_active: boolean;
}
// Typed GeoJSON interfaces
interface GeoJSONFeature {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: any;
}

@Component({
  selector: 'app-hotel-map-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hotel-map-view.component.html',
  styleUrls: ['./hotel-map-view.component.scss']
})
export class HotelMapViewComponent implements OnInit, OnDestroy {
  properties: Accommodation[] = [];
  loading = true;
  selectedType = 'all';
  searchTerm = '';
  selectedProperty: Accommodation | null = null;
  showLayerPanel = false;

  private map: L.Map | null = null;

  // Level tracking
  currentLevel: 'kecamatan' | 'kelurahan' | 'hotels' = 'kecamatan';
  navigationStack: Array<{ level: string; name: string; kode: string }> = [];

  // Selected units
  selectedKecamatanName: string | null = null;
  selectedKecamatanKode: string | null = null;
  selectedKelurahanName: string | null = null;
  selectedKelurahanKode: string | null = null;

  // Cached selected geometries for background rendering
  private selectedKecGeoJSON: GeoJSONFeature | null = null;
  private selectedKelGeoJSON: GeoJSONFeature | null = null;

  // GeoJSON Layers
  kecamatanGeoJsonLayer: L.GeoJSON | null = null;
  selectedKecamatanBgLayer: L.GeoJSON | null = null;
  kelurahanGeoJsonLayer: L.GeoJSON | null = null;
  selectedKelurahanBgLayer: L.GeoJSON | null = null;
  hotelMarkerLayer: L.LayerGroup | null = null;
  hotelClusterGroup: any = null;
  private hotelMarkers: L.Marker[] = [];
  private markerMap: Map<string, L.Marker> = new Map();

  // Cached boundaries
  private cachedKecamatanBoundaries: KecamatanBoundary[] = [];

  // Counts (computed from hotel data)
  kecamatanCounts: Map<string, { total: number; byType: Record<string, number> }> = new Map();
  kelurahanCounts: Map<string, { total: number; byType: Record<string, number> }> = new Map();

  AccommodationType = AccommodationType;
  accommodationMetadata = AccommodationTypeMetadata;

  typeOptions = [
    { value: 'all', label: 'Semua Tipe' },
    { value: AccommodationType.HOTEL, label: 'Hotel' },
    { value: AccommodationType.WISMA, label: 'Wisma' },
    { value: AccommodationType.HOMESTAY, label: 'Homestay' },
    { value: AccommodationType.PENGINAPAN, label: 'Penginapan' },
    { value: AccommodationType.RUMAH_KOS, label: 'Rumah Kos' }
  ];

  constructor(
    private accommodationService: AccommodationService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.hideGlobalSidebar();
    this.loadProperties();
  }

  ngOnDestroy(): void {
    this.showGlobalSidebar();
    this.cleanupLayers();
    if (this.map) {
      this.map.remove();
    }
  }

  private hideGlobalSidebar(): void {
    document.body.classList.add('hotel-map-active');
    const sidebar = document.querySelector('.app-menu, .navbar-menu');
    if (sidebar) { (sidebar as HTMLElement).style.display = 'none'; }
    const topbar = document.querySelector('#page-topbar');
    if (topbar) { (topbar as HTMLElement).style.display = 'none'; }
    const mainContent = document.querySelector('.main-content');
    if (mainContent) { (mainContent as HTMLElement).style.marginLeft = '0'; }
  }

  private showGlobalSidebar(): void {
    document.body.classList.remove('hotel-map-active');
    const sidebar = document.querySelector('.app-menu, .navbar-menu');
    if (sidebar) { (sidebar as HTMLElement).style.display = ''; }
    const topbar = document.querySelector('#page-topbar');
    if (topbar) { (topbar as HTMLElement).style.display = ''; }
    const mainContent = document.querySelector('.main-content');
    if (mainContent) { (mainContent as HTMLElement).style.marginLeft = ''; }
  }

  private initMap(): void {
    this.map = L.map('hotel-map', {
      center: [-8.1345, 113.2236],
      zoom: 11,
      doubleClickZoom: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    // Double-click on map background to go back
    this.map.on('dblclick', () => {
      if (this.currentLevel !== 'kecamatan') {
        this.back();
      }
    });

    this.loadKecamatanBoundaries();
  }

  loadProperties(): void {
    this.loading = true;
    this.accommodationService.getPropertiesForMap().subscribe({
      next: (data) => {
        this.properties = data;
        this.loading = false;
        this.computeKecamatanCounts();
        this.initMap();
      },
      error: (err: any) => {
        console.error('Error loading map data:', err);
        this.loading = false;
      }
    });
  }

  // ==================== COUNT COMPUTATION ====================

  private computeKecamatanCounts(): void {
    this.kecamatanCounts.clear();
    for (const hotel of this.properties) {
      const kec = hotel.kecamatan || 'UNKNOWN';
      if (!this.kecamatanCounts.has(kec)) {
        this.kecamatanCounts.set(kec, { total: 0, byType: {} });
      }
      const entry = this.kecamatanCounts.get(kec)!;
      entry.total++;
      const type = hotel.accommodationType;
      entry.byType[type] = (entry.byType[type] || 0) + 1;
    }
  }

  private computeKelurahanCounts(kecamatanName: string): void {
    this.kelurahanCounts.clear();
    const hotels = this.properties.filter(h => h.kecamatan === kecamatanName);
    for (const hotel of hotels) {
      const kel = hotel.kelurahan || 'UNKNOWN';
      if (!this.kelurahanCounts.has(kel)) {
        this.kelurahanCounts.set(kel, { total: 0, byType: {} });
      }
      const entry = this.kelurahanCounts.get(kel)!;
      entry.total++;
      const type = hotel.accommodationType;
      entry.byType[type] = (entry.byType[type] || 0) + 1;
    }
  }

  // ==================== HELPERS ====================

  private makeGeoJSONFeature(props: Record<string, any>, geometry: any): GeoJSONFeature {
    return { type: 'Feature', properties: props, geometry };
  }

  // ==================== LEVEL 1: KECAMATAN ====================

  private loadKecamatanBoundaries(): void {
    this.http.get<KecamatanBoundary[]>(`${API_BASE}/bprd/boundaries`).subscribe({
      next: (boundaries: KecamatanBoundary[]) => {
        this.cachedKecamatanBoundaries = boundaries;
        this.renderKecamatanPolygons(boundaries);
      },
      error: (err: any) => {
        console.error('Error loading kecamatan boundaries:', err);
        this.loading = false;
      }
    });
  }

  private renderKecamatanPolygons(boundaries: KecamatanBoundary[]): void {
    if (!this.map) return;

    this.cleanupLayers();

    this.kecamatanGeoJsonLayer = L.geoJSON(undefined, {
      style: () => ({
        color: '#FF6B35',
        weight: 3,
        dashArray: '5, 5',
        fillOpacity: 0.15,
        fillColor: '#FF6B35'
      }),
      onEachFeature: (feature: any, layer: L.Layer) => {
        const kecName = feature.properties.nama;
        const kdKec = feature.properties.kd_kec;
        const count = this.kecamatanCounts.get(kecName);
        const total = count ? count.total : 0;

        // Permanent label
        layer.bindTooltip(
          `<div class="kec-label">
            <strong>${kecName}</strong><br>
            <span class="hotel-count">${total} Akomodasi</span>
          </div>`,
          { permanent: true, direction: 'center', className: 'kecamatan-label-tooltip' }
        );

        // Hover effect
        layer.on({
          mouseover: (e: L.LeafletMouseEvent) => {
            const l = e.target as L.Path;
            l.setStyle({ weight: 5, fillOpacity: 0.3 });
          },
          mouseout: (e: L.LeafletMouseEvent) => {
            this.kecamatanGeoJsonLayer?.resetStyle(e.target);
          },
          dblclick: (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            this.onKecamatanDoubleClick(kecName, kdKec, e.target);
          }
        });
      }
    });

    for (const boundary of boundaries) {
      if (boundary.is_active && boundary.geojson) {
        const feature: GeoJSONFeature = {
          type: 'Feature',
          properties: { id: boundary.id, kd_kec: boundary.kd_kec, nama: boundary.nama },
          geometry: boundary.geojson
        };
        this.kecamatanGeoJsonLayer.addData(feature);
      }
    }

    this.kecamatanGeoJsonLayer.addTo(this.map);
    this.loading = false;
  }

  private onKecamatanDoubleClick(kecName: string, kdKec: string, _layer: L.Layer): void {
    this.selectedKecamatanName = kecName;
    this.selectedKecamatanKode = kdKec;
    this.currentLevel = 'kelurahan';
    this.navigationStack = [{ level: 'kecamatan', name: kecName, kode: kdKec }];
    this.computeKelurahanCounts(kecName);

    // Find and store the GeoJSON for the selected kecamatan
    const boundary = this.cachedKecamatanBoundaries.find(b => b.kd_kec === kdKec);
    if (boundary && boundary.geojson) {
      this.selectedKecGeoJSON = this.makeGeoJSONFeature(
        { kd_kec: kdKec, nama: kecName },
        boundary.geojson
      );
    }

    this.loadKelurahanBoundaries(kdKec);
  }

  // ==================== LEVEL 2: KELURAHAN ====================

  private loadKelurahanBoundaries(kdKec: string): void {
    if (!this.map) return;

    this.http.get<KelurahanBoundary[]>(`${API_BASE}/bprd/kelurahan?kd_kec=${kdKec}`).subscribe({
      next: (kelurahans: KelurahanBoundary[]) => {
        this.renderKelurahanPolygons(kelurahans);
      },
      error: (err: any) => {
        console.error('Error loading kelurahan boundaries:', err);
      }
    });
  }

  private renderKelurahanPolygons(kelurahans: KelurahanBoundary[]): void {
    if (!this.map) return;

    this.cleanupLayers();

    // Show selected kecamatan as grey background
    if (this.selectedKecGeoJSON) {
      this.selectedKecamatanBgLayer = L.geoJSON(this.selectedKecGeoJSON, {
        style: () => ({ color: '#999', fillColor: '#999', fillOpacity: 0.15, weight: 1 })
      }).addTo(this.map);
    }

    this.kelurahanGeoJsonLayer = L.geoJSON(undefined, {
      style: () => ({
        color: '#16a34a',
        weight: 2,
        fillOpacity: 0.2,
        fillColor: '#16a34a'
      }),
      onEachFeature: (feature: any, layer: L.Layer) => {
        const kelName = feature.properties.nama;
        const kdKel = feature.properties.kd_kel;
        const count = this.kelurahanCounts.get(kelName);
        const total = count ? count.total : 0;

        // Permanent label
        layer.bindTooltip(
          `<div class="kel-label">
            <strong>${kelName}</strong><br>
            <span class="hotel-count">${total} Akomodasi</span>
          </div>`,
          { permanent: true, direction: 'center', className: 'kelurahan-label-tooltip' }
        );

        // Hover effect
        layer.on({
          mouseover: (e: L.LeafletMouseEvent) => {
            const l = e.target as L.Path;
            l.setStyle({ weight: 4, fillOpacity: 0.35 });
          },
          mouseout: (e: L.LeafletMouseEvent) => {
            this.kelurahanGeoJsonLayer?.resetStyle(e.target);
          },
          dblclick: (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            this.onKelurahanDoubleClick(kelName, kdKel, feature);
          }
        });
      }
    });

    for (const kel of kelurahans) {
      if (kel.is_active && kel.geojson) {
        const feature: GeoJSONFeature = {
          type: 'Feature',
          properties: { id: kel.id, kd_kec: kel.kd_kec, kd_kel: kel.kd_kel, nama: kel.nama },
          geometry: kel.geojson
        };
        this.kelurahanGeoJsonLayer.addData(feature);
      }
    }

    if (this.selectedKecamatanBgLayer) {
      this.selectedKecamatanBgLayer.addTo(this.map);
    }
    this.kelurahanGeoJsonLayer.addTo(this.map);

    // Fit bounds
    try {
      const bounds = this.kelurahanGeoJsonLayer.getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [20, 20] });
      }
    } catch (e) {
      // ignore
    }
  }

  private onKelurahanDoubleClick(kelName: string, kdKel: string, feature: any): void {
    this.selectedKelurahanName = kelName;
    this.selectedKelurahanKode = kdKel;
    this.currentLevel = 'hotels';
    this.navigationStack.push({ level: 'kelurahan', name: kelName, kode: kdKel });

    // Store selected kelurahan GeoJSON
    if (feature.geometry) {
      this.selectedKelGeoJSON = {
        type: 'Feature',
        properties: { kd_kel: kdKel, nama: kelName },
        geometry: feature.geometry
      };
    }

    this.showHotelMarkers();
  }

  // ==================== LEVEL 3: HOTELS ====================

  private showHotelMarkers(): void {
    if (!this.map) return;

    this.cleanupLayers();

    // Show selected kecamatan as grey background
    if (this.selectedKecGeoJSON) {
      this.selectedKecamatanBgLayer = L.geoJSON(this.selectedKecGeoJSON, {
        style: () => ({ color: '#999', fillColor: '#999', fillOpacity: 0.1, weight: 1 })
      }).addTo(this.map);
    }

    // Show selected kelurahan as grey background
    if (this.selectedKelGeoJSON) {
      this.selectedKelurahanBgLayer = L.geoJSON(this.selectedKelGeoJSON, {
        style: () => ({ color: '#666', fillColor: '#666', fillOpacity: 0.15, weight: 2 })
      }).addTo(this.map);
    }

    // Setup cluster group
    this.hotelClusterGroup = (L as any).markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 17,
      iconCreateFunction: (cluster: any) => this.createClusterIcon(cluster)
    });

    const filtered = this.getFiltered();

    filtered.forEach(prop => {
      if (prop.latitude && prop.longitude) {
        const marker = L.marker([prop.latitude, prop.longitude], {
          icon: this.createMarkerIcon(prop)
        });

        (marker as any).accommodationType = prop.accommodationType;

        marker.bindPopup(this.buildPopupContent(prop), { maxWidth: 280, className: 'hotel-popup-wrapper' });
        marker.on('click', () => {
          this.selectedProperty = prop;
        });

        this.hotelClusterGroup!.addLayer(marker);
        this.hotelMarkers.push(marker);
        this.markerMap.set(prop.id, marker);
      }
    });

    this.hotelClusterGroup.addTo(this.map);

    // Fit bounds
    if (this.hotelMarkers.length > 0) {
      const group = L.featureGroup(this.hotelMarkers);
      this.map.fitBounds(group.getBounds().pad(0.15), { maxZoom: 16 });
    } else if (this.selectedKelGeoJSON) {
      try {
        const bounds = this.selectedKelurahanBgLayer?.getBounds();
        if (bounds && bounds.isValid()) {
          this.map.fitBounds(bounds, { padding: [20, 20] });
        }
      } catch (e) {
        // ignore
      }
    }
  }

  private createClusterIcon(cluster: any): L.DivIcon {
    const markers = cluster.getAllChildMarkers();
    const count = markers.length;

    // Count types
    const typeCount: Record<string, number> = {};
    markers.forEach((m: L.Marker) => {
      const type = (m as any).accommodationType || 'HOTEL';
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    // Dominant type
    const dominantType = Object.entries(typeCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'HOTEL';
    const color = this.accommodationMetadata[dominantType as AccommodationType]?.color || '#666';

    // Size based on count
    const size = count < 10 ? 36 : count < 30 ? 44 : count < 100 ? 52 : 60;

    return L.divIcon({
      html: `<div class="cluster-badge" style="background:${color};width:${size}px;height:${size}px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
        <span>${count}</span>
      </div>`,
      className: '',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2]
    });
  }

  private createMarkerIcon(prop: Accommodation): L.DivIcon {
    const color = this.accommodationMetadata[prop.accommodationType]?.color || '#666';
    const icon = this.accommodationMetadata[prop.accommodationType]?.riIcon || 'ri-hotel-line';

    return L.divIcon({
      html: `<div class="marker-pin" style="background:${color};">
        <i class="${icon}"></i>
      </div>`,
      className: 'hotel-marker-icon',
      iconSize: [32, 42],
      iconAnchor: [16, 42],
      popupAnchor: [0, -42]
    });
  }

  // ==================== NAVIGATION ====================

  back(): void {
    if (this.navigationStack.length === 0) return;

    const current = this.navigationStack[this.navigationStack.length - 1];

    if (current.level === 'kelurahan') {
      // Go back to kecamatan level
      this.clearHotelView();
    } else if (current.level === 'kecamatan') {
      // Go back to initial kecamatan view
      this.clearKelurahanView();
    }
  }

  private clearKelurahanView(): void {
    this.cleanupLayers();
    this.currentLevel = 'kecamatan';
    this.navigationStack = [];
    this.selectedKecamatanName = null;
    this.selectedKecamatanKode = null;
    this.selectedKelurahanName = null;
    this.selectedKelurahanKode = null;
    this.selectedKecGeoJSON = null;
    this.selectedKelGeoJSON = null;
    this.kelurahanCounts.clear();
    this.renderKecamatanPolygons(this.cachedKecamatanBoundaries);
    if (this.map) {
      this.map.setView([-8.1345, 113.2236], 11);
    }
  }

  private clearHotelView(): void {
    if (this.map) {
      if (this.hotelMarkerLayer) { this.map.removeLayer(this.hotelMarkerLayer); this.hotelMarkerLayer = null; }
      if (this.selectedKelurahanBgLayer) { this.map.removeLayer(this.selectedKelurahanBgLayer); this.selectedKelurahanBgLayer = null; }
      if (this.selectedKecamatanBgLayer) { this.map.removeLayer(this.selectedKecamatanBgLayer); this.selectedKecamatanBgLayer = null; }
    }
    this.hotelMarkers.forEach(m => m.remove());
    this.hotelMarkers = [];
    this.markerMap.clear();
    this.selectedKelGeoJSON = null;
    this.currentLevel = 'kelurahan';
    this.navigationStack.pop();

    // Restore kelurahan view
    if (this.selectedKecamatanKode) {
      this.http.get<KelurahanBoundary[]>(`${API_BASE}/bprd/kelurahan?kd_kec=${this.selectedKecamatanKode}`).subscribe({
        next: (kelurahans: KelurahanBoundary[]) => {
          this.kelurahanGeoJsonLayer = null;
          this.renderKelurahanPolygons(kelurahans);
        }
      });
    }
  }

  private cleanupLayers(): void {
    if (!this.map) return;
    if (this.kecamatanGeoJsonLayer) { this.map.removeLayer(this.kecamatanGeoJsonLayer); this.kecamatanGeoJsonLayer = null; }
    if (this.kelurahanGeoJsonLayer) { this.map.removeLayer(this.kelurahanGeoJsonLayer); this.kelurahanGeoJsonLayer = null; }
    if (this.selectedKecamatanBgLayer) { this.map.removeLayer(this.selectedKecamatanBgLayer); this.selectedKecamatanBgLayer = null; }
    if (this.selectedKelurahanBgLayer) { this.map.removeLayer(this.selectedKelurahanBgLayer); this.selectedKelurahanBgLayer = null; }
    if (this.hotelMarkerLayer) { this.map.removeLayer(this.hotelMarkerLayer); this.hotelMarkerLayer = null; }
    if (this.hotelClusterGroup) { this.map.removeLayer(this.hotelClusterGroup); this.hotelClusterGroup = null; }
    this.hotelMarkers.forEach(m => m.remove());
    this.hotelMarkers = [];
    this.markerMap.clear();
  }

  // ==================== FILTERS ====================

  getFiltered(): Accommodation[] {
    let result = [...this.properties];

    if (this.selectedKecamatanName) {
      result = result.filter(p => p.kecamatan === this.selectedKecamatanName);
    }

    if (this.selectedKelurahanName) {
      result = result.filter(p => p.kelurahan === this.selectedKelurahanName);
    }

    if (this.selectedType !== 'all') {
      result = result.filter(p => p.accommodationType === this.selectedType);
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(p =>
        p.propertyName?.toLowerCase().includes(term) ||
        p.ownerName?.toLowerCase().includes(term) ||
        p.address?.toLowerCase().includes(term)
      );
    }

    return result;
  }

  onFilterChange(): void {
    if (this.currentLevel === 'hotels') {
      this.cleanupLayers();

      if (this.selectedKecGeoJSON) {
        this.selectedKecamatanBgLayer = L.geoJSON(this.selectedKecGeoJSON, {
          style: () => ({ color: '#999', fillColor: '#999', fillOpacity: 0.1, weight: 1 })
        }).addTo(this.map!);
      }

      if (this.selectedKelGeoJSON) {
        this.selectedKelurahanBgLayer = L.geoJSON(this.selectedKelGeoJSON, {
          style: () => ({ color: '#666', fillColor: '#666', fillOpacity: 0.15, weight: 2 })
        }).addTo(this.map!);
      }

      this.hotelClusterGroup = (L as any).markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 17,
        iconCreateFunction: (cluster: any) => this.createClusterIcon(cluster)
      });

      const filtered = this.getFiltered();

      filtered.forEach(prop => {
        if (prop.latitude && prop.longitude) {
          const marker = L.marker([prop.latitude, prop.longitude], {
            icon: this.createMarkerIcon(prop)
          });
          (marker as any).accommodationType = prop.accommodationType;
          marker.bindPopup(this.buildPopupContent(prop), { maxWidth: 280, className: 'hotel-popup-wrapper' });
          marker.on('click', () => { this.selectedProperty = prop; });
          this.hotelClusterGroup!.addLayer(marker);
          this.hotelMarkers.push(marker);
          this.markerMap.set(prop.id, marker);
        }
      });

      this.hotelClusterGroup.addTo(this.map!);

      if (this.hotelMarkers.length > 0) {
        const group = L.featureGroup(this.hotelMarkers);
        this.map!.fitBounds(group.getBounds().pad(0.15), { maxZoom: 16 });
      }
    }
  }

  resetFilters(): void {
    this.selectedType = 'all';
    this.searchTerm = '';
    this.onFilterChange();
  }

  selectProperty(prop: Accommodation): void {
    this.selectedProperty = prop;
    const marker = this.markerMap.get(prop.id);
    if (marker) {
      marker.openPopup();
      if (this.map && prop.latitude && prop.longitude) {
        this.map.setView([prop.latitude, prop.longitude], 15, { animate: true });
      }
    }
  }

  toggleLayerPanel(): void {
    this.showLayerPanel = !this.showLayerPanel;
  }

  viewDetail(id: string): void {
    this.router.navigate(['/pbjt-hotel/hotel-detail', id]);
  }

  goBack(): void {
    this.router.navigate(['/pbjt-hotel/assessment-list']);
  }

  // ==================== GETTERS ====================

  get totalCount(): number {
    return this.getFiltered().length;
  }

  get hasCoordinates(): boolean {
    return this.getFiltered().some(p => p.latitude && p.longitude);
  }

  get breadcrumbLabel(): string {
    const parts: string[] = ['LUMAJANG'];
    for (const item of this.navigationStack) {
      parts.push(item.name);
    }
    return parts.join(' > ');
  }

  getTypeLabel(type: AccommodationType): string {
    return this.accommodationMetadata[type]?.label || type;
  }

  getTypeColor(type: AccommodationType): string {
    return this.accommodationMetadata[type]?.color || '#666';
  }

  // ==================== POPUP & FORMATTING ====================

  private buildPopupContent(prop: Accommodation): string {
    const typeColor = this.accommodationMetadata[prop.accommodationType]?.color || '#666';
    const typeLabel = this.accommodationMetadata[prop.accommodationType]?.label || prop.accommodationType;
    const typeIcon = this.accommodationMetadata[prop.accommodationType]?.riIcon || 'ri-hotel-line';

    // Image thumbnail — DB stores /uploads/hotel-images/file → serve via /api/file/hotel-images/file
    const imageHtml = prop.photoUrls && prop.photoUrls.length > 0
      ? `<div class="popup-image-wrap">
           <img src="/api/file/${prop.photoUrls[0].replace('/uploads/', '')}"
                alt="${prop.propertyName}"
                class="popup-image"
                onerror="this.parentElement.style.display='none'">
           ${prop.photoUrls.length > 1
              ? `<div class="popup-image-count"><i class="ri-image-fill"></i> ${prop.photoUrls.length}</div>`
              : ''}
         </div>`
      : '';

    return `
      <div class="hotel-popup">
        ${imageHtml}
        <div class="popup-header" style="background:${typeColor};">
          <div class="popup-header-content">
            <i class="${typeIcon}" style="font-size:18px;"></i>
            <span>${prop.propertyName}</span>
          </div>
        </div>
        <div class="popup-body">
          <div class="popup-type-badge" style="border-left:3px solid ${typeColor};">
            <span class="popup-type-label">${typeLabel}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label"><i class="ri-user-line"></i> Pemilik</span>
            <span class="popup-value">${prop.ownerName || '-'}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label"><i class="ri-hotel-bed-line"></i> Kamar</span>
            <span class="popup-value">${prop.totalRooms} kamar</span>
          </div>
          <div class="popup-row">
            <span class="popup-label"><i class="ri-map-pin-line"></i> Alamat</span>
            <span class="popup-value">${prop.address || '-'}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label"><i class="ri-map-line"></i> Kecamatan</span>
            <span class="popup-value">${prop.kecamatan || '-'}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label"><i class="ri-home-line"></i> Kelurahan</span>
            <span class="popup-value">${prop.kelurahan || '-'}</span>
          </div>
          <div class="popup-actions">
            <button class="popup-btn-detail" onclick="window.location.href='/pbjt-hotel/hotel-detail/${prop.id}'">
              <i class="ri-eye-line"></i> Lihat Detail
            </button>
          </div>
        </div>
      </div>
    `;
  }

  formatCurrency(value: number): string {
    if (!value || value === 0) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
  }
}
