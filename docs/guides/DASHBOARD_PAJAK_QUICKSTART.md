# Quick Start - Dashboard Pajak

## 🚀 Cara Cepat Menggunakan

### 1. Jalankan Aplikasi
```bash
cd leaflet-geo-FE
npm start
```

### 2. Buka Browser
```
http://localhost:4200/
```

atau

```
http://localhost:4200/dashboard-pajak
```

**Dashboard Pajak adalah halaman default (root route)!**

### 3. Fitur Utama

#### 📊 Melihat Chart
- **10 kategori pajak** ditampilkan dalam grid 2 kolom
- Setiap chart menampilkan data per tahun (2022-2025)
- Hover pada data point untuk melihat detail nilai

#### 🔍 Melihat Detail
1. **Klik pada chart** yang ingin dilihat
2. Modal akan terbuka dengan chart lebih besar
3. Lihat statistik tambahan di bawah chart
4. Klik "Tutup" atau klik di luar modal untuk menutup

#### 📈 Interaksi Chart
- **Zoom**: Klik dan drag pada area chart
- **Reset**: Double click pada chart
- **Toggle Tahun**: Klik pada legend untuk show/hide tahun tertentu

### 4. Navigasi Menu
- Dashboard Pajak ada di sidebar menu
- Badge "New" menandakan fitur baru
- Icon: 📊 (Dashboard icon)

## 📁 File yang Dibuat

```
src/app/pages/dashboard-pajak/
├── dashboard-pajak.component.ts       
├── dashboard-pajak.component.html     
├── dashboard-pajak.component.scss     
├── dashboard-pajak.component.spec.ts  
└── dashboard-pajak.module.ts          
```

## ✅ Yang Sudah Dikonfigurasi

- ✅ Routing: `/` (root/default page) dan `/dashboard-pajak`
- ✅ Menu sidebar dengan badge "New"
- ✅ Translation (EN & ID)
- ✅ ApexCharts integration
- ✅ Responsive layout (2 kolom desktop, 1 kolom mobile)
- ✅ Modal untuk detail chart
- ✅ Data dari `assets/master-pajak.json`

## 🎨 Kategori Pajak

1. Perhotelan
2. Restoran
3. Hiburan
4. Reklame
5. Penerangan Jalan
6. Parkir
7. Air Tanah
8. Minerba
9. PBB-P2
10. BPHTB

## 💡 Tips

- **Mobile**: Chart responsif, 1 kolom di layar kecil
- **Performance**: Data di-cache setelah load pertama
- **Zoom**: Gunakan toolbar di pojok kanan atas chart
- **Export**: Gunakan menu di toolbar chart untuk download

## 🐛 Troubleshooting Cepat

**Chart tidak muncul?**
```bash
# Cek apakah ng-apexcharts terinstall
npm list ng-apexcharts

# Jika belum, install
npm install ng-apexcharts apexcharts
```

**Error routing?**
- Pastikan sudah restart dev server setelah menambahkan routing

**Data tidak muncul?**
- Cek file `src/assets/master-pajak.json` ada
- Buka Developer Tools > Console untuk cek error

## 📞 Need Help?

Lihat dokumentasi lengkap di `DASHBOARD_PAJAK_README.md`
