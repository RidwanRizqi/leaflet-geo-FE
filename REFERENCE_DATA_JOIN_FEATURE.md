# Reference Data Join Feature - Enhanced Detail Display

## Overview
Sistem telah diupdate untuk menampilkan data referensi kecamatan, kelurahan, provinsi, dan kabupaten/kota dalam detail objek pajak dan subjek pajak. Data referensi ini di-join dari tabel `REF_KECAMATAN`, `REF_KELURAHAN`, `REF_PROPINSI`, dan `REF_DATI2`.

## Feature Description

### 1. **Enhanced Objek Pajak Display** 🏢
- **Provinsi**: Nama provinsi lengkap
- **Kabupaten/Kota**: Nama kabupaten/kota lengkap  
- **Kecamatan**: Nama kecamatan lengkap
- **Kelurahan**: Nama kelurahan lengkap
- **Alamat**: Alamat lengkap properti
- **Koordinat**: Latitude dan longitude

### 2. **Enhanced Subjek Pajak Display** 👤
- **Provinsi WP**: Nama provinsi wajib pajak
- **Kabupaten/Kota WP**: Nama kabupaten/kota wajib pajak
- **Kecamatan WP**: Nama kecamatan wajib pajak
- **Kelurahan WP**: Nama kelurahan wajib pajak
- **Alamat WP**: Alamat lengkap wajib pajak
- **Data Pribadi**: Nama, NPWP, NPWPD, dll

## Technical Implementation

### 1. **Backend Entity Updates**:

#### **DatObjekPajak Entity**:
```java
// Reference data fields added
private String nmKecamatan;
private String nmKelurahan;
private String nmPropinsi;
private String nmDati2;
```

#### **DatSubjekPajak Entity**:
```java
// Reference data fields added
private String nmKecamatan;
private String nmKelurahan;
private String nmPropinsi;
private String nmDati2;
```

### 2. **Repository Updates**:

#### **DatObjekPajakRepository**:
```java
public Optional<DatObjekPajak> findByIdWithReferences(String kdPropinsi, String kdDati2, String kdKecamatan, String kdKelurahan, String kdBlok, String noUrut, String kdJnsOp) {
    String sql = """
        SELECT op.*, 
               kec.NM_KECAMATAN,
               kel.NM_KELURAHAN,
               prop.NM_PROPINSI,
               dati2.NM_DATI2
        FROM SYSTEM.DAT_OBJEK_PAJAK op
        LEFT JOIN SYSTEM.REF_KECAMATAN kec ON op.KD_PROPINSI = kec.KD_PROPINSI 
                                            AND op.KD_DATI2 = kec.KD_DATI2 
                                            AND op.KD_KECAMATAN = kec.KD_KECAMATAN
        LEFT JOIN SYSTEM.REF_KELURAHAN kel ON op.KD_PROPINSI = kel.KD_PROPINSI 
                                            AND op.KD_DATI2 = kel.KD_DATI2 
                                            AND op.KD_KECAMATAN = kel.KD_KECAMATAN 
                                            AND op.KD_KELURAHAN = kel.KD_KELURAHAN
        LEFT JOIN SYSTEM.REF_PROPINSI prop ON op.KD_PROPINSI = prop.KD_PROPINSI
        LEFT JOIN SYSTEM.REF_DATI2 dati2 ON op.KD_PROPINSI = dati2.KD_PROPINSI 
                                          AND op.KD_DATI2 = dati2.KD_DATI2
        WHERE op.KD_PROPINSI = ? AND op.KD_DATI2 = ? AND op.KD_KECAMATAN = ? 
              AND op.KD_KELURAHAN = ? AND op.KD_BLOK = ? AND op.NO_URUT = ? AND op.KD_JNS_OP = ?
        """;
    
    List<DatObjekPajak> result = oracleJdbcTemplate.query(sql, this::mapRowToDatObjekPajak, 
        kdPropinsi, kdDati2, kdKecamatan, kdKelurahan, kdBlok, noUrut, kdJnsOp);
    return result.isEmpty() ? Optional.empty() : Optional.of(result.get(0));
}
```

#### **DatSubjekPajakRepository**:
```java
public Optional<DatSubjekPajak> findByIdWithReferences(String subjekPajakId) {
    String sql = """
        SELECT sp.*, 
               kec.NM_KECAMATAN,
               kel.NM_KELURAHAN,
               prop.NM_PROPINSI,
               dati2.NM_DATI2
        FROM SYSTEM.DAT_SUBJEK_PAJAK sp
        LEFT JOIN SYSTEM.REF_KECAMATAN kec ON sp.KELURAHAN_WP = kec.NM_KECAMATAN
        LEFT JOIN SYSTEM.REF_KELURAHAN kel ON sp.KELURAHAN_WP = kel.NM_KELURAHAN
        LEFT JOIN SYSTEM.REF_PROPINSI prop ON sp.KOTA_WP = prop.NM_PROPINSI
        LEFT JOIN SYSTEM.REF_DATI2 dati2 ON sp.KOTA_WP = dati2.NM_DATI2
        WHERE sp.SUBJEK_PAJAK_ID = ?
        """;
    
    List<DatSubjekPajak> result = oracleJdbcTemplate.query(sql, this::mapRowToDatSubjekPajak, subjekPajakId);
    return result.isEmpty() ? Optional.empty() : Optional.of(result.get(0));
}
```

### 3. **Controller Updates**:
```java
@GetMapping("/{kdPropinsi}/{kdDati2}/{kdKecamatan}/{kdKelurahan}/{kdBlok}/{noUrut}/{kdJnsOp}")
public ResponseEntity<Map<String, Object>> getDatObjekPajakById(...) {
    // Get objek pajak with reference data
    Optional<DatObjekPajak> objekPajak = datObjekPajakRepository.findByIdWithReferences(
        kdPropinsi, kdDati2, kdKecamatan, kdKelurahan, kdBlok, noUrut, kdJnsOp
    );

    if (objekPajak.isPresent()) {
        // Get subjek pajak data with reference data if available
        DatSubjekPajak subjekPajak = null;
        if (objekPajak.get().getSubjekPajakId() != null) {
            Optional<DatSubjekPajak> subjekPajakOpt = datSubjekPajakRepository.findByIdWithReferences(objekPajak.get().getSubjekPajakId());
            if (subjekPajakOpt.isPresent()) {
                subjekPajak = subjekPajakOpt.get();
            }
        }
        // ... return response
    }
}
```

### 4. **Frontend Display Updates**:

#### **Objek Pajak Location Section**:
```html
<!-- Location Information -->
<div class="row mb-4">
  <div class="col-12">
    <h6 class="text-primary mb-3">
      <i class="ri-map-pin-line me-2"></i>
      Informasi Lokasi
    </h6>
  </div>
  <div class="col-md-6">
    <!-- Basic location info -->
    <div class="info-item mb-3">
      <label class="form-label fw-bold text-muted small">Alamat</label>
      <p class="mb-0 fs-6">{{ objekPajakData[0].jalanOp || 'N/A' }}</p>
    </div>
    <!-- ... other basic info -->
  </div>
  <div class="col-md-6">
    <!-- Reference data -->
    <div class="info-item mb-3">
      <label class="form-label fw-bold text-muted small">Provinsi</label>
      <p class="mb-0 fs-6 fw-bold text-dark">{{ objekPajakData[0].nmPropinsi || 'N/A' }}</p>
    </div>
    <div class="info-item mb-3">
      <label class="form-label fw-bold text-muted small">Kabupaten/Kota</label>
      <p class="mb-0 fs-6 fw-bold text-dark">{{ objekPajakData[0].nmDati2 || 'N/A' }}</p>
    </div>
    <div class="info-item mb-3">
      <label class="form-label fw-bold text-muted small">Kecamatan</label>
      <p class="mb-0 fs-6 fw-bold text-dark">{{ objekPajakData[0].nmKecamatan || 'N/A' }}</p>
    </div>
    <div class="info-item mb-3">
      <label class="form-label fw-bold text-muted small">Kelurahan</label>
      <p class="mb-0 fs-6 fw-bold text-dark">{{ objekPajakData[0].nmKelurahan || 'N/A' }}</p>
    </div>
  </div>
</div>
```

#### **Subjek Pajak Reference Section**:
```html
<!-- Subjek Pajak Information -->
<div *ngIf="objekPajakData[0].subjekPajak" class="row">
  <div class="col-12">
    <hr class="my-4">
    <h6 class="text-primary mb-3">
      <i class="ri-user-line me-2"></i>
      Data Subjek Pajak
    </h6>
  </div>
  <!-- Basic subjek pajak info -->
  <div class="col-md-6">
    <div class="info-item mb-3">
      <label class="form-label fw-bold text-muted small">Nama WP</label>
      <p class="mb-0 fs-6 fw-bold text-dark">{{ objekPajakData[0].subjekPajak.nmWp || 'N/A' }}</p>
    </div>
    <!-- ... other basic info -->
  </div>
  <!-- Reference data -->
  <div class="col-12">
    <div class="row">
      <div class="col-md-6">
        <div class="info-item mb-3">
          <label class="form-label fw-bold text-muted small">Provinsi WP</label>
          <p class="mb-0 fs-6 fw-bold text-dark">{{ objekPajakData[0].subjekPajak.nmPropinsi || 'N/A' }}</p>
        </div>
      </div>
      <div class="col-md-6">
        <div class="info-item mb-3">
          <label class="form-label fw-bold text-muted small">Kabupaten/Kota WP</label>
          <p class="mb-0 fs-6 fw-bold text-dark">{{ objekPajakData[0].subjekPajak.nmDati2 || 'N/A' }}</p>
        </div>
      </div>
    </div>
    <div class="row">
      <div class="col-md-6">
        <div class="info-item mb-3">
          <label class="form-label fw-bold text-muted small">Kecamatan WP</label>
          <p class="mb-0 fs-6 fw-bold text-dark">{{ objekPajakData[0].subjekPajak.nmKecamatan || 'N/A' }}</p>
        </div>
      </div>
      <div class="col-md-6">
        <div class="info-item mb-3">
          <label class="form-label fw-bold text-muted small">Kelurahan WP</label>
          <p class="mb-0 fs-6 fw-bold text-dark">{{ objekPajakData[0].subjekPajak.nmKelurahan || 'N/A' }}</p>
        </div>
      </div>
    </div>
  </div>
</div>
```

## Database Schema

### 1. **Reference Tables**:
- **`SYSTEM.REF_PROPINSI`**: Provinsi data
- **`SYSTEM.REF_DATI2`**: Kabupaten/Kota data
- **`SYSTEM.REF_KECAMATAN`**: Kecamatan data
- **`SYSTEM.REF_KELURAHAN`**: Kelurahan data

### 2. **Main Tables**:
- **`SYSTEM.DAT_OBJEK_PAJAK`**: Objek pajak data
- **`SYSTEM.DAT_SUBJEK_PAJAK`**: Subjek pajak data

### 3. **Join Relationships**:
```sql
-- Objek Pajak joins
LEFT JOIN SYSTEM.REF_KECAMATAN kec ON op.KD_PROPINSI = kec.KD_PROPINSI 
                                    AND op.KD_DATI2 = kec.KD_DATI2 
                                    AND op.KD_KECAMATAN = kec.KD_KECAMATAN
LEFT JOIN SYSTEM.REF_KELURAHAN kel ON op.KD_PROPINSI = kel.KD_PROPINSI 
                                    AND op.KD_DATI2 = kel.KD_DATI2 
                                    AND op.KD_KECAMATAN = kel.KD_KECAMATAN 
                                    AND op.KD_KELURAHAN = kel.KD_KELURAHAN
LEFT JOIN SYSTEM.REF_PROPINSI prop ON op.KD_PROPINSI = prop.KD_PROPINSI
LEFT JOIN SYSTEM.REF_DATI2 dati2 ON op.KD_PROPINSI = dati2.KD_PROPINSI 
                                  AND op.KD_DATI2 = dati2.KD_DATI2
```

## User Experience

### 1. **Enhanced Information Display** 📋
- **Complete Location**: Provinsi, kabupaten/kota, kecamatan, kelurahan
- **Better Context**: User dapat melihat lokasi lengkap
- **Professional Look**: Data referensi ditampilkan dengan styling yang konsisten

### 2. **Improved Data Quality** ✨
- **Consistent Naming**: Nama lokasi yang konsisten
- **Complete Information**: Tidak ada data kosong yang mengganggu
- **Better Understanding**: User lebih mudah memahami lokasi

### 3. **Visual Hierarchy** 🎨
- **Reference Data**: Ditampilkan dengan `fw-bold text-dark`
- **Basic Data**: Ditampilkan dengan styling normal
- **Clear Sections**: Dipisahkan dengan section yang jelas

## Benefits

### 1. **Better User Experience** 🎯
- **Complete Information**: Data lokasi yang lengkap
- **Professional Display**: Tampilan yang lebih profesional
- **Easy Understanding**: User lebih mudah memahami data

### 2. **Data Quality** 📊
- **Consistent Naming**: Nama lokasi yang konsisten
- **Complete Context**: Konteks lokasi yang lengkap
- **Better Accuracy**: Data yang lebih akurat

### 3. **System Performance** ⚡
- **Single Query**: Data referensi di-join dalam satu query
- **Efficient**: Tidak perlu multiple API calls
- **Fast Response**: Response time yang lebih cepat

## Files Modified

### 1. **Backend Files**:
- **`DatObjekPajak.java`**: Added reference data fields
- **`DatSubjekPajak.java`**: Added reference data fields
- **`DatObjekPajakRepository.java`**: Added join queries
- **`DatSubjekPajakRepository.java`**: Added join queries
- **`DatObjekPajakController.java`**: Updated to use reference data

### 2. **Frontend Files**:
- **`bidang-map.component.html`**: Updated display to show reference data

## Testing Scenarios

### 1. **Data Display Testing**:
- Verify reference data is displayed correctly
- Check data consistency
- Test with missing reference data

### 2. **Performance Testing**:
- Test query performance
- Check response times
- Verify memory usage

### 3. **UI Testing**:
- Test responsive design
- Check data formatting
- Verify visual hierarchy

## Future Enhancements

### 1. **Advanced Features**:
- **Map Integration**: Show location on map
- **Search by Location**: Search by reference data
- **Location Statistics**: Statistics by location

### 2. **Performance Optimization**:
- **Caching**: Cache reference data
- **Indexing**: Optimize database indexes
- **Query Optimization**: Further optimize queries

### 3. **UI Improvements**:
- **Interactive Maps**: Clickable location data
- **Location History**: Track location changes
- **Export Features**: Export with reference data

## Conclusion

Fitur **Reference Data Join** memberikan informasi lokasi yang lebih lengkap dan profesional. Dengan menampilkan nama provinsi, kabupaten/kota, kecamatan, dan kelurahan yang lengkap, user dapat dengan mudah memahami konteks lokasi dari objek pajak dan subjek pajak.

**Sekarang detail objek pajak dan subjek pajak menampilkan informasi lokasi yang lengkap dan profesional!** 🎉

## Usage Summary

- **Objek Pajak**: Menampilkan lokasi lengkap (provinsi, kabupaten/kota, kecamatan, kelurahan)
- **Subjek Pajak**: Menampilkan lokasi lengkap wajib pajak
- **Reference Data**: Di-join dari tabel referensi
- **Professional Display**: Styling yang konsisten dan profesional
