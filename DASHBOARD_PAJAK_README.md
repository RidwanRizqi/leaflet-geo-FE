# Dashboard Pajak Daerah

Dashboard visualisasi data pajak daerah menggunakan ApexCharts dengan Angular.

## 📊 Fitur

1. **Visualisasi 10 Kategori Pajak**
   - Perhotelan
   - Restoran
   - Hiburan
   - Reklame
   - Penerangan Jalan
   - Parkir
   - Air Tanah
   - Minerba (Mineral dan Batubara)
   - PBB-P2 (Pajak Bumi dan Bangunan Perdesaan dan Perkotaan)
   - BPHTB (Bea Perolehan Hak atas Tanah dan Bangunan)

2. **Layout Responsif 2 Kolom**
   - Desktop: 2 chart per baris
   - Mobile: 1 chart per baris (responsif)

3. **Interaktif Chart dengan Modal**
   - Klik pada chart untuk melihat versi lebih besar
   - Modal menampilkan chart dengan ukuran 500px
   - Menampilkan statistik tambahan:
     - Total keseluruhan per kategori
     - Jumlah data
     - Rata-rata per bulan

4. **Chart Features**
   - Line chart dengan multiple series (per tahun)
   - Smooth curve
   - Zoom enabled
   - Tooltip dengan format currency
   - Color palette yang berbeda untuk setiap kategori
   - Hover effects

5. **Summary Cards**
   - Menampilkan total pajak per kategori di bagian atas
   - Format currency yang mudah dibaca (Miliar/Juta/Ribu)

## 🚀 Cara Menggunakan

### 1. Akses Dashboard

Buka browser dan navigasi ke:
```
http://localhost:4200/
```

atau

```
http://localhost:4200/dashboard-pajak
```

**Dashboard Pajak adalah halaman default (root route)!**

### 2. Melihat Chart

- Setiap chart menampilkan data pajak per kategori
- Data dikelompokkan per tahun dengan warna berbeda
- Sumbu X: Bulan (Januari - Desember)
- Sumbu Y: Nilai pajak (format currency)

### 3. Melihat Detail di Modal

1. **Klik pada chart** yang ingin dilihat lebih detail
2. Modal akan terbuka dengan chart berukuran lebih besar
3. Di modal tersedia:
   - Chart dengan height 500px
   - Total keseluruhan kategori
   - Jumlah data poin
   - Rata-rata per bulan
4. **Klik tombol "Tutup"** atau klik di luar modal untuk menutup

### 4. Interaksi dengan Chart

- **Zoom**: Klik dan drag pada area chart untuk zoom
- **Reset Zoom**: Double click pada chart
- **Toggle Series**: Klik pada legend untuk show/hide series tertentu
- **Hover**: Arahkan mouse untuk melihat detail value

## 📁 Struktur File

```
src/app/pages/dashboard-pajak/
├── dashboard-pajak.component.ts       # Logic & data processing
├── dashboard-pajak.component.html     # Template UI
├── dashboard-pajak.component.scss     # Styling
├── dashboard-pajak.component.spec.ts  # Unit tests
└── dashboard-pajak.module.ts          # Module definition
```

## 🔧 Teknologi

- **Angular 18**
- **ApexCharts** via ng-apexcharts
- **Bootstrap 5** untuk layout
- **TypeScript**
- **RxJS** untuk data handling

## 📊 Sumber Data

Data diambil dari file JSON:
```
src/assets/master-pajak.json
```

Format data:
```json
{
  "kategori": "Perhotelan",
  "tahun": 2022,
  "bulan": "Januari",
  "value": 67862570
}
```

## 🎨 Kustomisasi

### Mengubah Warna Chart

Edit di `dashboard-pajak.component.ts`:
```typescript
private colorPalette = [
  '#008FFB', // Biru
  '#00E396', // Hijau
  '#FEB019', // Kuning
  '#FF4560', // Merah
  // ... tambahkan warna lain
];
```

### Mengubah Tinggi Chart

**Chart Default (Card):**
```typescript
chart: {
  height: 300, // Ubah nilai ini
  // ...
}
```

**Chart Modal:**
```typescript
chart: {
  height: 500, // Ubah nilai ini
  // ...
}
```

### Mengubah Format Currency

Edit method `formatCurrency()` di component:
```typescript
formatCurrency(value: number): string {
  if (value >= 1000000000) {
    return 'Rp ' + (value / 1000000000).toFixed(2) + 'M';
  }
  // ... custom format
}
```

## 🐛 Troubleshooting

### Chart tidak muncul

1. Pastikan ng-apexcharts sudah terinstall:
```bash
npm list ng-apexcharts
```

2. Pastikan file `master-pajak.json` ada di `src/assets/`

3. Cek console browser untuk error

### Data tidak ter-load

1. Buka Developer Tools (F12)
2. Cek tab Network untuk request ke `master-pajak.json`
3. Pastikan file JSON valid (gunakan JSON validator)

### Modal tidak muncul

1. Pastikan Bootstrap CSS sudah ter-load
2. Cek z-index di browser inspector
3. Cek console untuk JavaScript errors

## 📝 Catatan Pengembangan

### Data Processing Flow

1. `loadPajakData()` - Load data dari JSON
2. `processData()` - Extract unique categories
3. `createChartOptions()` - Create chart config per category
4. `groupByYear()` - Group data by year for series

### Performance

- Data di-cache setelah load pertama
- Chart options dibuat sekali saat init
- Modal chart dibuat on-demand saat dibuka

## 🔮 Future Enhancements

- [ ] Filter by year range
- [ ] Export chart as image
- [ ] Compare multiple categories
- [ ] Add bar chart & pie chart options
- [ ] Download data as CSV
- [ ] Print functionality
- [ ] Real-time data update via API
- [ ] Add trend analysis
- [ ] Predictive analytics

## 📞 Support

Untuk pertanyaan atau issue, hubungi tim development BPRD.
