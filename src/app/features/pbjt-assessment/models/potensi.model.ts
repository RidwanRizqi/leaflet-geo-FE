export interface MasterMenu {
  id?: number;
  namaMenu: string;
  kategori: 'FOOD' | 'BEVERAGE' | string;
  defaultHarga?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItem {
  name: string;
  price: number;
  category: 'FOOD' | 'BEVERAGE' | string;
  qty?: number;
  subtotal?: number;
}

export interface PbjtPotensi {
  id?: number;
  kodePotensi?: string;
  namaUsaha: string;
  tipeUsaha?: string;
  tanggalPendataan: string;
  kapasitasKursi?: number;
  luasBangunan?: number;
  jamBuka?: string;
  jamTutup?: string;
  paymentMethods?: string[];
  alamat?: string;
  kelurahan?: string;
  kecamatan?: string;
  kabupaten?: string;
  kdKec?: string;
  kdKel?: string;
  latitude?: number;
  longitude?: number;
  roadType?: string;
  nearSchool?: boolean;
  nearOffice?: boolean;
  nearMarket?: boolean;
  crowdLevel?: 'SEPI' | 'NORMAL' | 'RAMAI' | string;
  openingDaysPerMonth?: number;
  menuItems?: MenuItem[];
  customerOrderEstimates?: string;
  bestSellingMenus?: string;
  crowdPeakTimes?: string;
  omzetBulanan?: number;
  pbjtBulanan?: number;
  pbjtTahunan?: number;
  surveyorId?: string;
  updatedBy?: string;
  photoUrls?: string[];
  supportingDocUrl?: string;
  notes?: string;
  observationCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PotensiObservation {
  id?: number;
  potensiId?: number;
  tanggalObservasi: string;
  tipeWaktu: 'PEAK' | 'NORMAL' | 'OFF_PEAK' | string;
  jumlahPengunjung: number;
  durasiJam: number;
  pengunjungPerJam?: number;
  vph?: number;
  menuItems?: MenuItem[];
  avgFoodPrice?: number;
  avgBeveragePrice?: number;
  spendPerPerson?: number;
  avgSpendPerPerson?: number;
  estimatedDailyVisitors?: number;
  estimatedMonthlyRevenue?: number;
  estimatedMonthlyPbjt?: number;
  estimatedPbjtBulanan?: number;
  estimatedAnnualPbjt?: number;
  petugas?: string;
  catatan?: string;
  photoUrls?: string[];
  surveyKe?: number;
  createdAt?: string;
}

export interface PotensiListResponse {
  success: boolean;
  data: PbjtPotensi[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  message?: string;
}
