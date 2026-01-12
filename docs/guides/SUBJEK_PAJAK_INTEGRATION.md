# Subjek Pajak Integration - Complete Data Display

## Overview
Sekarang sistem sudah terintegrasi dengan data **Subjek Pajak** dan menampilkan informasi lengkap tentang wajib pajak ketika user mengklik bidang di map.

## Backend Integration ✅

### API Response Structure
Endpoint `GET /api/dat-objek-pajak/{kdPropinsi}/{kdDati2}/{kdKecamatan}/{kdKelurahan}/{kdBlok}/{noUrut}/{kdJnsOp}` sudah mengembalikan data lengkap:

```json
{
  "success": true,
  "message": "Data objek pajak berhasil diambil",
  "objekPajak": {
    "kdPropinsi": "35",
    "kdDati2": "08",
    "kdKecamatan": "100",
    "kdKelurahan": "006",
    "kdBlok": "001",
    "noUrut": "0055",
    "kdJnsOp": "0",
    "subjekPajakId": "350810000600100550            ",
    "noFormulirSpop": "20092105078",
    "noPersil": null,
    "jalanOp": "KLETEK",
    "blokKavNoOp": null,
    "rwOp": "12",
    "rtOp": "001",
    "kdStatusCabang": 0,
    "kdStatusWp": "1",
    "totalLuasBumi": 558,
    "totalLuasBng": 0,
    "njopBumi": 15066000,
    "njopBng": 0,
    "statusPetaOp": 1,
    "jnsTransaksiOp": "1",
    "tglPendataanOp": "2009-12-08",
    "nipPendata": "060000000",
    "tglPemeriksaanOp": "2009-12-08",
    "nipPemeriksaOp": "060000000",
    "tglPerekamanOp": "2009-12-11",
    "nipPerekamOp": "060000000",
    "noSertifikat": null,
    "keteranganOp": null,
    "keteranganSpop": null,
    "latitude": null,
    "longitude": null
  },
  "subjekPajak": {
    "subjekPajakId": "350810000600100550            ",
    "nmWp": "BUSRI CS",
    "jalanWp": "KLETEK",
    "blokKavNoWp": null,
    "rwWp": "12",
    "rtWp": "001",
    "kelurahanWp": "JATIROTO",
    "kotaWp": "LUMAJANG",
    "kdPosWp": null,
    "telpWp": null,
    "npwp": "-",
    "statusPekerjaanWp": "5",
    "npwpd": null,
    "email": null
  }
}
```

## Frontend Integration ✅

### 1. **Updated Data Handling** (`thematic-map.component.ts`):

```typescript
// BEFORE - Only objek pajak data
this.objekPajakData = response.objekPajak ? [response.objekPajak] : [];

// AFTER - Include subjek pajak data
if (response.objekPajak) {
  const objekPajakWithSubjek = {
    ...response.objekPajak,
    subjekPajak: response.subjekPajak || null
  };
  this.objekPajakData = [objekPajakWithSubjek];
} else {
  this.objekPajakData = [];
}
```

### 2. **Enhanced Modal Display** (`thematic-map.component.html`):

#### **Objek Pajak Information**:
- Blok, Jenis OP, No Formulir, No Persil
- Luas Bumi, Luas Bangunan, NJOP Bumi, NJOP Bangunan
- Alamat, RT/RW, Koordinat

#### **Subjek Pajak Information** (NEW):
- **Nama WP**: Nama wajib pajak
- **NPWP**: Nomor Pokok Wajib Pajak
- **NPWPD**: Nomor Pokok Wajib Pajak Daerah
- **Status Pekerjaan**: Status pekerjaan wajib pajak
- **Alamat WP**: Alamat wajib pajak
- **RT/RW WP**: RT/RW alamat wajib pajak
- **Kelurahan**: Kelurahan wajib pajak
- **Kota**: Kota wajib pajak
- **Telepon**: Nomor telepon wajib pajak
- **Email**: Email wajib pajak

### 3. **Visual Design**:

```html
<!-- Subjek Pajak Information -->
<div *ngIf="objek.subjekPajak" class="row mt-3">
  <div class="col-12">
    <hr class="my-2">
    <h6 class="text-primary mb-2">
      <i class="ri-user-line me-1"></i>
      Data Subjek Pajak
    </h6>
    <div class="row">
      <div class="col-6">
        <p class="mb-1"><strong>Nama WP:</strong> {{ objek.subjekPajak.nmWp || 'N/A' }}</p>
        <p class="mb-1"><strong>NPWP:</strong> {{ objek.subjekPajak.npwp || 'N/A' }}</p>
        <p class="mb-1"><strong>NPWPD:</strong> {{ objek.subjekPajak.npwpd || 'N/A' }}</p>
        <p class="mb-1"><strong>Status Pekerjaan:</strong> {{ objek.subjekPajak.statusPekerjaanWp || 'N/A' }}</p>
      </div>
      <div class="col-6">
        <p class="mb-1"><strong>Alamat WP:</strong> {{ objek.subjekPajak.jalanWp || 'N/A' }}</p>
        <p class="mb-1"><strong>RT/RW WP:</strong> {{ objek.subjekPajak.rtWp || 'N/A' }}/{{ objek.subjekPajak.rwWp || 'N/A' }}</p>
        <p class="mb-1"><strong>Kelurahan:</strong> {{ objek.subjekPajak.kelurahanWp || 'N/A' }}</p>
        <p class="mb-1"><strong>Kota:</strong> {{ objek.subjekPajak.kotaWp || 'N/A' }}</p>
      </div>
    </div>
    <div class="row mt-2">
      <div class="col-12">
        <p class="mb-1"><strong>Telepon:</strong> {{ objek.subjekPajak.telpWp || 'N/A' }}</p>
        <p class="mb-1"><strong>Email:</strong> {{ objek.subjekPajak.email || 'N/A' }}</p>
      </div>
    </div>
  </div>
</div>
```

## User Experience Flow

### 1. **Map Interaction**:
- User mengklik bidang di map
- Sistem mengambil data objek pajak + subjek pajak
- Modal terbuka dengan informasi lengkap

### 2. **Data Display**:
- **Section 1**: Informasi Objek Pajak (properti, luas, nilai)
- **Section 2**: Informasi Subjek Pajak (wajib pajak, alamat, kontak)
- **Visual Separation**: HR line dan icon untuk membedakan section

### 3. **Responsive Design**:
- 2 kolom untuk data subjek pajak
- Fallback ke 'N/A' untuk data kosong
- Conditional display (hanya tampil jika ada data subjek pajak)

## Benefits

### 1. **Complete Information**:
- User mendapat informasi lengkap tentang properti dan pemiliknya
- Tidak perlu navigasi tambahan untuk melihat data subjek pajak

### 2. **Better User Experience**:
- Single click untuk semua informasi
- Organized display dengan visual separation
- Responsive layout untuk berbagai ukuran layar

### 3. **Data Integrity**:
- Backend sudah melakukan join yang proper
- Frontend menangani data dengan aman (null checks)
- Consistent data structure

## Technical Implementation

### 1. **Backend**:
- `DatObjekPajakController.getDatObjekPajakById()` sudah include subjek pajak
- `DatSubjekPajakRepository.findById()` untuk lookup subjek pajak
- Proper error handling dan null checks

### 2. **Frontend**:
- Data merging di `loadObjekPajakData()`
- Template conditional rendering dengan `*ngIf`
- Consistent styling dengan Bootstrap classes

### 3. **Data Flow**:
```
Map Click → loadObjekPajakData() → getDatObjekPajakById() → 
Backend Join → Response with both data → 
Frontend Merge → Template Display
```

## Testing

### Test URL:
```
http://localhost:8080/api/dat-objek-pajak/35/08/100/006/001/0055/0
```

### Expected Result:
- Single objek pajak dengan `kdBlok = '001'`
- Complete subjek pajak data (nama, alamat, NPWP, dll.)
- Modal menampilkan kedua informasi dengan layout yang rapi

## Files Modified

1. **`src/app/pages/bidang/bidang-map/thematic-map.component.ts`**
   - Updated `loadObjekPajakData()` to merge subjek pajak data
   - Enhanced data handling for complete information

2. **`src/app/pages/bidang/bidang-map/thematic-map.component.html`**
   - Added subjek pajak information section
   - Enhanced modal layout with visual separation
   - Responsive design for better UX

## Future Enhancements

1. **Data Validation**: Add validation for required fields
2. **Export Functionality**: Allow export of complete data
3. **Search Integration**: Search by subjek pajak information
4. **History Tracking**: Track changes in subjek pajak data
5. **Print Functionality**: Print-friendly modal layout
