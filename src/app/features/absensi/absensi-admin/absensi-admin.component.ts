import { Component, OnInit, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import * as L from 'leaflet';
import Swal from 'sweetalert2';
import { AttendanceService } from '../../../services/attendance.service';
import { Attendance, AttendanceSummary, AttendanceUserLocation, OfficeLocation } from '../../../models/attendance.model';

@Component({
  selector: 'app-absensi-admin',
  templateUrl: './absensi-admin.component.html',
  styleUrls: ['./absensi-admin.component.scss']
})
export class AbsensiAdminComponent implements OnInit, AfterViewInit, OnDestroy {
  // Filter
  selectedDate: string = ''; // Kosong = Menampilkan Semua Data
  selectedRole: string = '';
  searchKeyword: string = '';
  quickFilter: 'ALL' | 'TODAY' | 'CUSTOM' = 'ALL';

  // Data
  summary: AttendanceSummary | null = null;
  attendanceList: Attendance[] = [];
  filteredList: Attendance[] = [];
  locationMarkers: AttendanceUserLocation[] = [];
  isLoading: boolean = false;

  // Leaflet Map
  private map: L.Map | null = null;
  private markerLayerGroup: L.LayerGroup | null = null;
  private officeLocation: OfficeLocation = {
    nama: 'Kantor BPRD Lumajang',
    latitude: -8.134386886649747,
    longitude: 113.22632802023689,
    radiusMeter: 150
  };

  // Preview Foto Modal & Interactive Zoom State
  selectedPhotoUrl: string | null = null;
  selectedPhotoTitle: string = '';
  selectedPhotoSubtitle: string = '';
  selectedPhotoType: 'MASUK' | 'PULANG' = 'MASUK';
  photoZoom: number = 1.0;
  photoRotation: number = 0;
  panX: number = 0;
  panY: number = 0;
  isDragging: boolean = false;
  dragStartX: number = 0;
  dragStartY: number = 0;

  constructor(private attendanceService: AttendanceService) {}

  ngOnInit(): void {
    // Default: Muat semua data riwayat absensi (tidak hanya hari ini)
    this.selectedDate = '';
    this.quickFilter = 'ALL';
    this.loadAllData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initAdminMap();
    }, 300);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  // ========================================================
  // DATA FETCHING & FILTERING
  // ========================================================
  loadAllData(): void {
    this.isLoading = true;

    // Load summary statistik
    this.attendanceService.getAdminSummary(this.selectedDate).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.summary = res.data;
        }
      },
      error: (err) => console.error('Gagal mengambil summary:', err)
    });

    // Load list data tabel kehadiran (semua atau per tanggal)
    this.attendanceService.getAdminList(this.selectedDate, this.selectedRole).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.success && res.data) {
          this.attendanceList = res.data;
          this.filterTable();
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('Gagal mengambil daftar kehadiran:', err);
      }
    });

    // Load data marker lokasi untuk peta
    this.attendanceService.getAdminLocations(this.selectedDate).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.locationMarkers = res.data;
          this.plotMapMarkers();
        }
      },
      error: (err) => console.error('Gagal mengambil data lokasi peta:', err)
    });
  }

  filterTable(): void {
    let list = [...this.attendanceList];
    if (this.searchKeyword.trim()) {
      const q = this.searchKeyword.toLowerCase().trim();
      list = list.filter(item =>
        (item.userName && item.userName.toLowerCase().includes(q)) ||
        (item.userRole && item.userRole.toLowerCase().includes(q)) ||
        (item.lokasiStatus && item.lokasiStatus.toLowerCase().includes(q)) ||
        (item.tanggal && item.tanggal.toLowerCase().includes(q)) ||
        (item.deviceInfo && item.deviceInfo.toLowerCase().includes(q))
      );
    }
    this.filteredList = list;
  }

  setFilterAll(): void {
    this.selectedDate = '';
    this.quickFilter = 'ALL';
    this.loadAllData();
  }

  setFilterToday(): void {
    const today = new Date();
    this.selectedDate = today.toISOString().substring(0, 10);
    this.quickFilter = 'TODAY';
    this.loadAllData();
  }

  onDateChange(): void {
    if (this.selectedDate) {
      this.quickFilter = 'CUSTOM';
    } else {
      this.quickFilter = 'ALL';
    }
    this.loadAllData();
  }

  onRoleChange(): void {
    this.loadAllData();
  }

  // ========================================================
  // LEAFLET MAP TRACKING
  // ========================================================
  private initAdminMap(): void {
    const container = document.getElementById('adminTrackingMap');
    if (!container) return;

    this.map = L.map('adminTrackingMap').setView(
      [this.officeLocation.latitude, this.officeLocation.longitude],
      16
    );

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    // Office circle boundary
    L.circle([this.officeLocation.latitude, this.officeLocation.longitude], {
      color: '#28a745',
      fillColor: '#28a745',
      fillOpacity: 0.15,
      radius: this.officeLocation.radiusMeter
    }).addTo(this.map);

    // Office Pin
    const officeIcon = L.divIcon({
      className: 'custom-office-pin',
      html: `<div style="background:#28a745;color:white;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,0.3)">🏢 ${this.officeLocation.nama}</div>`,
      iconSize: [120, 30],
      iconAnchor: [60, 15]
    });
    L.marker([this.officeLocation.latitude, this.officeLocation.longitude], { icon: officeIcon }).addTo(this.map);

    this.markerLayerGroup = L.layerGroup().addTo(this.map);
    this.plotMapMarkers();
  }

  private plotMapMarkers(): void {
    if (!this.map || !this.markerLayerGroup) return;

    this.markerLayerGroup.clearLayers();

    if (this.locationMarkers.length === 0) return;

    const bounds = L.latLngBounds([[this.officeLocation.latitude, this.officeLocation.longitude]]);

    this.locationMarkers.forEach((userLoc) => {
      if (!userLoc.latitude || !userLoc.longitude) return;

      const isDiKantor = userLoc.lokasiStatus === 'DI_KANTOR';
      const pinColor = isDiKantor ? '#28a745' : '#dc3545';
      const statusIcon = isDiKantor ? '🏢' : '📍';

      const userIcon = L.divIcon({
        className: 'user-map-marker',
        html: `
          <div style="background:${pinColor};color:white;padding:4px 8px;border-radius:14px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;gap:4px">
            <span>${statusIcon} ${userLoc.userName || 'User'}</span>
          </div>
        `,
        iconSize: [120, 28],
        iconAnchor: [60, 14]
      });

      const photoMasukHtml = userLoc.fotoMasuk
        ? `<div class="mb-2 text-center"><img src="${this.attendanceService.getPhotoUrl(userLoc.fotoMasuk)}" style="width:110px;height:110px;object-fit:cover;border-radius:8px;border:1px solid #ddd;cursor:pointer;" title="Klik foto untuk melihat lebih besar" alt="Foto Masuk"/></div>`
        : '';

      const popupContent = `
        <div style="min-width: 190px; font-family: sans-serif;">
          ${photoMasukHtml}
          <h6 style="margin: 0 0 4px 0; font-weight: bold; color: #333;">${userLoc.userName}</h6>
          <div style="display:flex;gap:4px;margin-bottom:6px;">
            <span style="font-size: 10px; background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-weight:600;">${userLoc.userRole}</span>
            <span style="font-size: 10px; background: #e7f5ff; color: #1c7ed6; padding: 2px 6px; border-radius: 4px;">${userLoc.tanggal || ''}</span>
          </div>
          <hr style="margin: 6px 0;"/>
          <p style="margin: 2px 0; font-size: 12px;"><strong>Masuk:</strong> ${userLoc.jamMasuk ? userLoc.jamMasuk.substring(11, 16) + ' WIB' : '-'}</p>
          <p style="margin: 2px 0; font-size: 12px;"><strong>Pulang:</strong> ${userLoc.jamPulang ? userLoc.jamPulang.substring(11, 16) + ' WIB' : '-'}</p>
          <p style="margin: 2px 0; font-size: 12px;"><strong>Status:</strong> <span style="color:${pinColor};font-weight:bold;">${isDiKantor ? 'Di Kantor' : 'Di Luar Kantor'}</span></p>
          <p style="margin: 2px 0; font-size: 12px;"><strong>Jarak:</strong> ${userLoc.jarakMeter ? Math.round(userLoc.jarakMeter) : 0} meter</p>
        </div>
      `;

      const marker = L.marker([userLoc.latitude, userLoc.longitude], { icon: userIcon })
        .bindPopup(popupContent);

      this.markerLayerGroup!.addLayer(marker);
      bounds.extend([userLoc.latitude, userLoc.longitude]);
    });

    if (this.locationMarkers.length > 0) {
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    }
  }

  // ========================================================
  // EXPORT CSV
  // ========================================================
  exportCsv(): void {
    if (this.filteredList.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Tidak Ada Data',
        text: 'Tidak ada data absensi untuk diekspor.'
      });
      return;
    }

    const headers = ['No', 'Nama Pengguna', 'Role', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status Lokasi', 'Jarak (m)', 'Status Kehadiran', 'Foto Masuk', 'Foto Pulang'];
    const rows = this.filteredList.map((item, index) => {
      const jamMasuk = item.jamMasuk ? item.jamMasuk.substring(11, 16) : '-';
      const jamPulang = item.jamPulang ? item.jamPulang.substring(11, 16) : '-';
      const statusKehadiran = item.isCompleted ? 'Lengkap' : (item.jamMasuk ? 'Masuk Saja' : 'Belum Absen');

      return [
        index + 1,
        `"${item.userName || '-'}"`,
        `"${item.userRole || '-'}"`,
        item.tanggal,
        jamMasuk,
        jamPulang,
        item.lokasiStatus || '-',
        item.jarakMeter ? Math.round(item.jarakMeter) : 0,
        `"${statusKehadiran}"`,
        `"${item.fotoMasuk || '-'}"`,
        `"${item.fotoPulang || '-'}"`
      ].join(',');
    });

    const filename = this.selectedDate ? `Rekap_Absensi_${this.selectedDate}.csv` : 'Rekap_Semua_Data_Absensi.csv';
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ========================================================
  // PHOTO MODAL VIEWER & INTERACTIVE ZOOM
  // ========================================================
  viewPhotoModal(item: Attendance, type: 'MASUK' | 'PULANG'): void {
    const filename = type === 'MASUK' ? item.fotoMasuk : item.fotoPulang;
    if (!filename) return;

    this.selectedPhotoUrl = this.attendanceService.getPhotoUrl(filename);
    this.selectedPhotoTitle = item.userName || 'Foto Absensi';
    this.selectedPhotoType = type;

    const waktu = type === 'MASUK' ? item.jamMasuk : item.jamPulang;
    const waktuFormatted = waktu ? (waktu.substring(11, 16) + ' WIB') : '-';
    const statusLok = item.lokasiStatus === 'DI_KANTOR' ? '🏢 Di Kantor' : '📍 Di Luar Kantor';
    const jarakStr = item.jarakMeter ? ` (${Math.round(item.jarakMeter)} m)` : '';

    this.selectedPhotoSubtitle = `${item.tanggal || ''} • Jam: ${waktuFormatted} • Status: ${statusLok}${jarakStr}`;
    this.resetZoom();
  }

  getTransformStyle(): string {
    return `translate(${this.panX}px, ${this.panY}px) scale(${this.photoZoom}) rotate(${this.photoRotation}deg)`;
  }

  closePhotoModal(): void {
    this.selectedPhotoUrl = null;
    this.resetZoom();
  }

  zoomIn(): void {
    if (this.photoZoom < 4.0) {
      this.photoZoom = Math.min(4.0, +(this.photoZoom + 0.25).toFixed(2));
    }
  }

  zoomOut(): void {
    if (this.photoZoom > 0.5) {
      this.photoZoom = Math.max(0.5, +(this.photoZoom - 0.25).toFixed(2));
      if (this.photoZoom <= 1.0) {
        this.panX = 0;
        this.panY = 0;
      }
    }
  }

  resetZoom(): void {
    this.photoZoom = 1.0;
    this.photoRotation = 0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
  }

  rotatePhoto(): void {
    this.photoRotation = (this.photoRotation + 90) % 360;
  }

  toggleZoom(): void {
    if (this.photoZoom > 1.0) {
      this.resetZoom();
    } else {
      this.photoZoom = 2.0;
    }
  }

  onPhotoWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  startDrag(event: MouseEvent): void {
    if (this.photoZoom <= 1.0) return;
    event.preventDefault();
    this.isDragging = true;
    this.dragStartX = event.clientX - this.panX;
    this.dragStartY = event.clientY - this.panY;
  }

  onDrag(event: MouseEvent): void {
    if (!this.isDragging) return;
    event.preventDefault();
    this.panX = event.clientX - this.dragStartX;
    this.panY = event.clientY - this.dragStartY;
  }

  stopDrag(): void {
    this.isDragging = false;
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.selectedPhotoUrl) return;
    if (event.key === 'Escape') {
      this.closePhotoModal();
    } else if (event.key === '+' || event.key === '=') {
      this.zoomIn();
    } else if (event.key === '-' || event.key === '_') {
      this.zoomOut();
    } else if (event.key === '0') {
      this.resetZoom();
    }
  }

  getPhotoUrl(filename?: string): string {
    return filename ? this.attendanceService.getPhotoUrl(filename) : '';
  }
}
