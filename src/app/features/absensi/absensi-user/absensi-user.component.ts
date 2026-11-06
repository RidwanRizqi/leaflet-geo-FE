import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { Store } from '@ngrx/store';
import { Subscription } from 'rxjs';
import * as L from 'leaflet';
import Swal from 'sweetalert2';
import { AttendanceService } from '../../../services/attendance.service';
import { selectCurrentUser } from '../../../store/auth/auth.selector';
import { User } from '../../../models/auth.models';
import { Attendance, AttendanceStatusToday, OfficeLocation } from '../../../models/attendance.model';

@Component({
  selector: 'app-absensi-user',
  templateUrl: './absensi-user.component.html',
  styleUrls: ['./absensi-user.component.scss']
})
export class AbsensiUserComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;

  // User info
  currentUser: User | null = null;
  private userSub!: Subscription;

  // Real-time Clock
  currentTime: string = '';
  currentDate: string = '';
  private clockTimer: any;

  // Status Absensi Hari Ini
  todayStatus: AttendanceStatusToday | null = null;
  todayAttendance: Attendance | null = null;
  officeLocation: OfficeLocation = {
    nama: 'Kantor BPRD Lumajang',
    latitude: -8.134386886649747,
    longitude: 113.22632802023689,
    radiusMeter: 150
  };

  // State GPS & Lokasi
  latitude: number | null = null;
  longitude: number | null = null;
  gpsAccuracy: number | null = null;
  distanceMeter: number | null = null;
  isWithinRadius: boolean = false;
  isLocating: boolean = false;
  isLocationReady: boolean = false;
  locationErrorMsg: string = '';

  // Mini Map Leaflet
  private map: L.Map | null = null;
  private userMarker: L.Marker | null = null;
  private officeMarker: L.Marker | null = null;
  private officeCircle: L.Circle | null = null;

  // Kamera Modal & Capture (Default ke Kamera Belakang / Lingkungan Sekitar)
  isCameraOpen: boolean = false;
  activeAbsenType: 'MASUK' | 'PULANG' = 'MASUK';
  currentFacingMode: 'environment' | 'user' = 'environment';
  cameraStream: MediaStream | null = null;
  capturedPhotoBase64: string | null = null;
  isSubmitting: boolean = false;

  // Riwayat Absensi
  historyList: Attendance[] = [];
  isLoadingHistory: boolean = false;

  constructor(
    private store: Store,
    private attendanceService: AttendanceService
  ) {}

  ngOnInit(): void {
    this.startDigitalClock();

    // Subscribe user profile
    this.userSub = this.store.select(selectCurrentUser).subscribe(user => {
      this.currentUser = user;
    });

    this.loadTodayStatus();
    this.loadHistory();
  }

  ngAfterViewInit(): void {
    // Request GPS lokasi begitu halaman dimuat
    this.requestLocation();
  }

  ngOnDestroy(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
    }
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
    this.stopCameraStream();
    if (this.map) {
      this.map.remove();
    }
  }

  // ========================================================
  // REAL-TIME CLOCK
  // ========================================================
  private startDigitalClock(): void {
    this.updateClock();
    this.clockTimer = setInterval(() => {
      this.updateClock();
    }, 1000);
  }

  private updateClock(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('id-ID', { hour12: false });
    this.currentDate = now.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // ========================================================
  // PETUNJUK ABSEN MODAL (POPUP EMOJI)
  // ========================================================
  openInstructionsModal(): void {
    Swal.fire({
      title: '<div class="d-flex align-items-center justify-content-center gap-2 text-success"><span class="fs-24">💡</span> <span class="fw-bold">Petunjuk & Tata Cara Absensi</span></div>',
      html: `
        <div class="text-start fs-13 py-1">
          <div class="p-3 mb-2 rounded-3 bg-light border-start border-4 border-success">
            <div class="fw-bold text-success mb-1">🛰️ 1. Aktifkan GPS / Lokasi Ponsel</div>
            <p class="text-muted mb-0">Pastikan layanan GPS/Lokasi pada smartphone aktif dan izinkan browser mengakses lokasi Anda secara presisi.</p>
          </div>

          <div class="p-3 mb-2 rounded-3 bg-light border-start border-4 border-primary">
            <div class="fw-bold text-primary mb-1">🏢 2. Berada di Area Kantor</div>
            <p class="text-muted mb-0">Sistem memverifikasi posisi Anda terhadap radius kantor BPRD Lumajang (maksimal ${this.officeLocation.radiusMeter} meter).</p>
          </div>

          <div class="p-3 mb-2 rounded-3 bg-light border-start border-4 border-info">
            <div class="fw-bold text-info mb-1">📸 3. Foto Sekitar Kantor (Portrait)</div>
            <p class="text-muted mb-0">Ambil foto suasana ruangan atau lingkungan sekitar kantor Anda secara potret (bukan selfie wajah) sebagai bukti fisik kehadiran.</p>
          </div>

          <div class="p-3 rounded-3 bg-light border-start border-4 border-warning">
            <div class="fw-bold text-dark mb-1">✅ 4. Konfirmasi & Kirim</div>
            <p class="text-muted mb-0">Tekan tombol <strong>Kirim Absensi</strong>. Waktu kehadiran dan koordinat Anda langsung tervalidasi secara real-time.</p>
          </div>
        </div>
      `,
      confirmButtonText: 'Saya Mengerti, Siap Absen!',
      confirmButtonColor: '#059669',
      customClass: {
        popup: 'rounded-4 shadow-lg border-0'
      }
    });
  }

  // ========================================================
  // DATA FETCHING
  // ========================================================
  loadTodayStatus(): void {
    this.attendanceService.getTodayStatus().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.todayStatus = res.data;
          this.todayAttendance = res.data.attendance || null;
          if (res.data.officeLocation) {
            this.officeLocation = res.data.officeLocation;
          }
          if (this.latitude !== null && this.longitude !== null) {
            this.calculateDistanceAndRadius();
            this.updateMap();
          }
        }
      },
      error: (err) => {
        console.error('Gagal mengambil status hari ini:', err);
      }
    });
  }

  loadHistory(): void {
    this.isLoadingHistory = true;
    this.attendanceService.getMyHistory().subscribe({
      next: (res) => {
        this.isLoadingHistory = false;
        if (res.success && res.data) {
          this.historyList = res.data;
        }
      },
      error: (err) => {
        this.isLoadingHistory = false;
        console.error('Gagal mengambil riwayat:', err);
      }
    });
  }

  // ========================================================
  // GEOLOCATION & GPS (STRICT POLICY WITH SWEETALERT)
  // ========================================================
  requestLocation(): void {
    if (!navigator.geolocation) {
      this.locationErrorMsg = 'Browser di perangkat Anda tidak mendukung Geolocation.';
      Swal.fire({
        icon: 'error',
        title: 'Perangkat Tidak Mendukung',
        text: this.locationErrorMsg,
        confirmButtonText: 'Tutup'
      });
      return;
    }

    this.isLocating = true;
    this.locationErrorMsg = '';

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.isLocating = false;
        this.latitude = position.coords.latitude;
        this.longitude = position.coords.longitude;
        this.gpsAccuracy = Math.round(position.coords.accuracy);
        this.isLocationReady = true;

        this.calculateDistanceAndRadius();
        this.initOrUpdateMap();
      },
      (error) => {
        this.isLocating = false;
        this.isLocationReady = false;

        switch (error.code) {
          case error.POSITION_UNAVAILABLE:
            this.locationErrorMsg = 'Layanan GPS HP nonaktif.';
            Swal.fire({
              icon: 'warning',
              title: 'GPS HP Belum Aktif! 🛰️',
              html: `
                <div class="text-start">
                  <p>Layanan lokasi pada HP Anda sedang <strong>nonaktif</strong>.</p>
                  <hr/>
                  <p class="mb-1"><strong>Langkah mengaktifkan:</strong></p>
                  <ol class="ps-3 mb-2">
                    <li>Tarik bilah notifikasi HP Anda ke bawah.</li>
                    <li>Aktifkan ikon <strong>"Lokasi / GPS"</strong>.</li>
                    <li>Klik tombol di bawah ini untuk mencoba kembali.</li>
                  </ol>
                </div>
              `,
              confirmButtonText: 'Sudah Diaktifkan, Coba Lagi',
              confirmButtonColor: '#3085d6',
              allowOutsideClick: false
            }).then(() => this.requestLocation());
            break;

          case error.PERMISSION_DENIED:
            this.locationErrorMsg = 'Izin lokasi diblokir oleh browser.';
            Swal.fire({
              icon: 'error',
              title: 'Izin Lokasi Ditolak 🚫',
              html: `
                <div class="text-start">
                  <p>Aplikasi memerlukan izin lokasi untuk memverifikasi kehadiran Anda.</p>
                  <hr/>
                  <p class="mb-1"><strong>Cara mengizinkan:</strong></p>
                  <ol class="ps-3 mb-2">
                    <li>Klik ikon gembok / setelan di address bar browser.</li>
                    <li>Pilih <strong>Izin Situs / Permissions</strong>.</li>
                    <li>Ubah izin <strong>Lokasi</strong> menjadi <strong>Izinkan (Allow)</strong>.</li>
                  </ol>
                </div>
              `,
              confirmButtonText: 'Saya Sudah Mengizinkan, Coba Lagi',
              confirmButtonColor: '#28a745',
              allowOutsideClick: false
            }).then(() => this.requestLocation());
            break;

          case error.TIMEOUT:
            this.locationErrorMsg = 'Timeout mencari sinyal GPS.';
            Swal.fire({
              icon: 'warning',
              title: 'Sinyal GPS Lemah (Timeout) ⏳',
              text: 'Gagal mengunci posisi GPS dalam batas waktu. Pastikan Anda berada di area terbuka dengan koneksi internet stabil.',
              confirmButtonText: 'Coba Lagi',
              confirmButtonColor: '#f39c12'
            }).then(() => this.requestLocation());
            break;

          default:
            this.locationErrorMsg = 'Gagal mendeteksi lokasi.';
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  }

  private calculateDistanceAndRadius(): void {
    if (this.latitude === null || this.longitude === null) return;

    // Haversine formula
    const R = 6371000; // meters
    const dLat = (this.officeLocation.latitude - this.latitude) * Math.PI / 180;
    const dLon = (this.officeLocation.longitude - this.longitude) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.latitude * Math.PI / 180) * Math.cos(this.officeLocation.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    this.distanceMeter = Math.round(R * c);

    this.isWithinRadius = this.distanceMeter <= this.officeLocation.radiusMeter;
  }

  // ========================================================
  // LEAFLET MINI-MAP
  // ========================================================
  private initOrUpdateMap(): void {
    if (!this.map) {
      setTimeout(() => {
        const mapContainer = document.getElementById('userMiniMap');
        if (!mapContainer || this.latitude === null || this.longitude === null) return;

        this.map = L.map('userMiniMap').setView([this.latitude, this.longitude], 17);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(this.map);

        this.updateMap();
      }, 200);
    } else {
      this.updateMap();
    }
  }

  private updateMap(): void {
    if (!this.map || this.latitude === null || this.longitude === null) return;

    // Office circle radius
    if (this.officeCircle) {
      this.officeCircle.remove();
    }
    this.officeCircle = L.circle([this.officeLocation.latitude, this.officeLocation.longitude], {
      color: '#059669',
      fillColor: '#10b981',
      fillOpacity: 0.18,
      radius: this.officeLocation.radiusMeter
    }).addTo(this.map);

    // Office marker
    if (this.officeMarker) {
      this.officeMarker.remove();
    }
    const officeIcon = L.divIcon({
      className: 'custom-office-pin',
      html: `<div style="background:linear-gradient(135deg, #059669, #047857);color:white;padding:5px 10px;border-radius:14px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid #ffffff">🏢 ${this.officeLocation.nama}</div>`,
      iconSize: [140, 32],
      iconAnchor: [70, 16]
    });
    this.officeMarker = L.marker([this.officeLocation.latitude, this.officeLocation.longitude], { icon: officeIcon }).addTo(this.map);

    // User marker
    if (this.userMarker) {
      this.userMarker.remove();
    }
    const userPinGradient = this.isWithinRadius
      ? 'linear-gradient(135deg, #059669, #10b981)'
      : 'linear-gradient(135deg, #d97706, #f59e0b)';
    const userIcon = L.divIcon({
      className: 'custom-user-pin',
      html: `
        <div style="background:${userPinGradient};color:white;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:700;box-shadow:0 4px 10px rgba(0,0,0,0.35);display:flex;align-items:center;gap:6px;border:2px solid #ffffff">
          <span>📍 Posisi Anda</span>
        </div>
      `,
      iconSize: [120, 36],
      iconAnchor: [60, 18]
    });
    this.userMarker = L.marker([this.latitude, this.longitude], { icon: userIcon }).addTo(this.map);

    this.map.setView([this.latitude, this.longitude], 17);
  }

  // ========================================================
  // CAMERA CAPTURE (PORTRAIT ENVIRONMENT / SURROUNDING PHOTO)
  // ========================================================
  openCamera(type: 'MASUK' | 'PULANG'): void {
    if (!this.isLocationReady || this.latitude === null || this.longitude === null) {
      Swal.fire({
        icon: 'warning',
        title: 'Lokasi Belum Terbaca',
        text: 'Harap aktifkan GPS dan tunggu hingga koordinat lokasi Anda terdeteksi sebelum mengambil foto.',
        confirmButtonText: 'Deteksi Lokasi Sekarang',
        confirmButtonColor: '#059669'
      }).then(() => this.requestLocation());
      return;
    }

    this.activeAbsenType = type;
    this.capturedPhotoBase64 = null;
    this.isCameraOpen = true;

    setTimeout(() => {
      this.startCameraStream();
    }, 200);
  }

  closeCameraModal(): void {
    this.stopCameraStream();
    this.isCameraOpen = false;
    this.capturedPhotoBase64 = null;
  }

  toggleCameraFacing(): void {
    this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
    this.stopCameraStream();
    this.startCameraStream();
  }

  private startCameraStream(): void {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: this.currentFacingMode },
        width: { ideal: 720 },
        height: { ideal: 960 }
      },
      audio: false
    };

    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      this.cameraStream = stream;
      if (this.videoElement && this.videoElement.nativeElement) {
        this.videoElement.nativeElement.srcObject = stream;
      }
    }).catch(err => {
      console.warn('Gagal dengan facingMode ideal, mencoba default video:', err);
      navigator.mediaDevices.getUserMedia({ video: true, audio: false }).then(stream => {
        this.cameraStream = stream;
        if (this.videoElement && this.videoElement.nativeElement) {
          this.videoElement.nativeElement.srcObject = stream;
        }
      }).catch(fallbackErr => {
        console.error('Kamera error:', fallbackErr);
        this.closeCameraModal();
        Swal.fire({
          icon: 'error',
          title: 'Kamera Tidak Dapat Dibuka',
          text: 'Pastikan browser diizinkan mengakses kamera di perangkat Anda.',
          confirmButtonText: 'Mengerti',
          confirmButtonColor: '#059669'
        });
      });
    });
  }

  private stopCameraStream(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
  }

  snapPhoto(): void {
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 960;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame dari kamera (lingkungan kantor)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Watermark Tanggal, Jam & Koordinat
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`● BPRD LUMAJANG - BUKTI LOKASI KANTOR (${this.activeAbsenType})`, 14, canvas.height - 36);

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    const nowStr = new Date().toLocaleString('id-ID');
    const coordStr = `Lat: ${this.latitude?.toFixed(6)}, Lng: ${this.longitude?.toFixed(6)} (±${this.gpsAccuracy}m)`;
    ctx.fillText(`${nowStr} | ${coordStr}`, 14, canvas.height - 14);

    this.capturedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.88);
  }

  retakePhoto(): void {
    this.capturedPhotoBase64 = null;
  }

  // ========================================================
  // SUBMISSION (CHECK-IN / CHECK-OUT)
  // ========================================================
  submitAttendance(): void {
    if (!this.capturedPhotoBase64) {
      Swal.fire({
        icon: 'warning',
        title: 'Foto Belum Diambil',
        text: 'Silakan ambil foto suasana sekitar kantor terlebih dahulu sebagai bukti kehadiran!',
        confirmButtonColor: '#059669'
      });
      return;
    }

    const typeLabel = this.activeAbsenType === 'MASUK' ? 'Absen Masuk' : 'Absen Pulang';
    const locationStatusLabel = this.isWithinRadius ? '🏢 Di Kantor' : '📍 Di Luar Kantor';

    Swal.fire({
      icon: 'question',
      title: `Konfirmasi ${typeLabel}?`,
      html: `
        <div class="text-start">
          <p class="mb-1"><strong>Nama:</strong> ${this.currentUser?.nama || '-'}</p>
          <p class="mb-1"><strong>Role:</strong> ${this.currentUser?.role || '-'}</p>
          <p class="mb-1"><strong>Status Lokasi:</strong> ${locationStatusLabel}</p>
          <p class="mb-1"><strong>Jarak:</strong> ${this.distanceMeter} meter dari kantor</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `Ya, Kirim ${typeLabel}`,
      cancelButtonText: 'Batal',
      confirmButtonColor: '#28a745'
    }).then(result => {
      if (result.isConfirmed) {
        this.executeSubmit();
      }
    });
  }

  private executeSubmit(): void {
    this.isSubmitting = true;

    const payload = {
      latitude: this.latitude!,
      longitude: this.longitude!,
      gpsAccuracy: this.gpsAccuracy || 0,
      fotoBase64: this.capturedPhotoBase64!,
      deviceInfo: navigator.userAgent.substring(0, 200)
    };

    const request$ = this.activeAbsenType === 'MASUK'
      ? this.attendanceService.checkIn(payload)
      : this.attendanceService.checkOut(payload);

    request$.subscribe({
      next: (res) => {
        this.isSubmitting = false;
        this.closeCameraModal();

        if (res.success && res.data) {
          const typeLabel = this.activeAbsenType === 'MASUK' ? 'Masuk' : 'Pulang';
          const jamStr = this.activeAbsenType === 'MASUK'
            ? res.data.jamMasuk?.substring(11, 16)
            : res.data.jamPulang?.substring(11, 16);

          Swal.fire({
            icon: 'success',
            title: `Absen ${typeLabel} Berhasil! 🎉`,
            html: `
              <div class="text-start">
                <p class="mb-1"><strong>Nama:</strong> ${this.currentUser?.nama}</p>
                <p class="mb-1"><strong>Jam:</strong> ${jamStr || this.currentTime}</p>
                <p class="mb-1"><strong>Status:</strong> ${res.data.lokasiStatus === 'DI_KANTOR' ? '🏢 Di Kantor' : '📍 Di Luar Kantor'}</p>
                <p class="mb-1"><strong>Jarak:</strong> ${res.data.jarakMeter} meter</p>
              </div>
            `,
            confirmButtonText: 'Selesai',
            confirmButtonColor: '#28a745',
            timer: 4000,
            timerProgressBar: true
          });

          this.loadTodayStatus();
          this.loadHistory();
        }
      },
      error: (err) => {
        this.isSubmitting = false;
        const msg = err.error?.message || err.message || 'Gagal mengirim absensi.';
        Swal.fire({
          icon: 'error',
          title: 'Gagal Absensi',
          text: msg,
          confirmButtonText: 'Tutup'
        });
      }
    });
  }

  getPhotoUrl(filename?: string): string {
    return filename ? this.attendanceService.getPhotoUrl(filename) : '';
  }
}
