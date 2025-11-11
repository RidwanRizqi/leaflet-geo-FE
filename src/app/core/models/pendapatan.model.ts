export interface DashboardSummary {
  totalTarget: number;
  totalRealisasi: number;
  totalWp: number;
  totalObjek: number;
  totalTransaksi: number;
  jenisPajakAktif: number;
  persentasePencapaian: number;
  selisih: number;
}

export interface TargetRealisasi {
  jenisPajak: string;
  urutan: number;
  target: number;
  realisasi: number;
  selisih: number;
  persentasePencapaian: number;
}

export interface TrendBulanan {
  bulan: number;
  namaBulan: string;
  realisasiBulan: number;
  realisasiKumulatif: number;
}

export interface TopKontributor {
  npwpd: string;
  namaWp: string;
  jenisPajak: string;
  totalPembayaran: number;
  jumlahTransaksi: number;
}
