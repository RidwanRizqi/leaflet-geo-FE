export interface Attendance {
  id: number;
  userId: string;
  userName?: string;
  userRole?: string;
  tanggal: string; // YYYY-MM-DD
  jamMasuk?: string; // ISO string
  jamPulang?: string; // ISO string

  // Lokasi Masuk
  latitude: number;
  longitude: number;
  lokasiStatus: 'DI_KANTOR' | 'DI_LUAR_KANTOR' | string;
  jarakMeter?: number;
  gpsAccuracy?: number;
  fotoMasuk?: string;

  // Lokasi Pulang
  pulangLatitude?: number;
  pulangLongitude?: number;
  pulangLokasiStatus?: 'DI_KANTOR' | 'DI_LUAR_KANTOR' | string;
  pulangJarakMeter?: number;
  pulangGpsAccuracy?: number;
  fotoPulang?: string;

  deviceInfo?: string;
  isCompleted?: boolean;
}

export interface AttendanceCheckInRequest {
  latitude: number;
  longitude: number;
  gpsAccuracy?: number;
  fotoBase64?: string;
  deviceInfo?: string;
}

export interface AttendanceCheckOutRequest {
  latitude: number;
  longitude: number;
  gpsAccuracy?: number;
  fotoBase64?: string;
  deviceInfo?: string;
}

export interface OfficeLocation {
  id?: number;
  nama: string;
  latitude: number;
  longitude: number;
  radiusMeter: number;
  isActive?: boolean;
}

export interface AttendanceSetting {
  id?: number;
  roleName: string;
  isMandatory: boolean;
  defaultLandingUrl: string;
  jamMasukStart?: string;
  jamMasukEnd?: string;
  jamPulangStart?: string;
  jamPulangEnd?: string;
}

export interface AttendanceStatusToday {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  isMandatory: boolean;
  defaultLandingUrl: string;
  attendance?: Attendance;
  officeLocation?: OfficeLocation;
  setting?: AttendanceSetting;
}

export interface AttendanceSummary {
  tanggal: string;
  totalUser: number;
  totalHadir: number;
  totalBelumHadir: number;
  totalDiKantor: number;
  totalDiLuarKantor: number;
}

export interface AttendanceUserLocation {
  id: number;
  userId: string;
  userName: string;
  userRole: string;
  tanggal: string;
  jamMasuk?: string;
  jamPulang?: string;
  latitude: number;
  longitude: number;
  lokasiStatus: 'DI_KANTOR' | 'DI_LUAR_KANTOR' | string;
  jarakMeter?: number;
  fotoMasuk?: string;
  pulangLatitude?: number;
  pulangLongitude?: number;
  pulangLokasiStatus?: string;
  pulangJarakMeter?: number;
  fotoPulang?: string;
}
