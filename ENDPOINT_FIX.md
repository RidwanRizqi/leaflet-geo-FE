# Endpoint Fix - Specific Objek Pajak Lookup

## Problem
Sebelumnya, ketika user mengklik bidang di map, sistem memanggil endpoint:
```
GET /api/dat-objek-pajak/detail/{kdPropinsi}/{kdDati2}/{kdKecamatan}/{kdKelurahan}/{noUrut}
```

Endpoint ini mengembalikan **semua** objek pajak yang memiliki kombinasi `kdPropinsi`, `kdDati2`, `kdKecamatan`, `kdKelurahan`, dan `noUrut` yang sama, **tidak peduli** `kdBlok`-nya.

### Example:
- **URL**: `/detail/35/08/100/006/0055`
- **Query**: `WHERE KD_PROPINSI = '35' AND KD_DATI2 = '08' AND KD_KECAMATAN = '100' AND KD_KELURAHAN = '006' AND NO_URUT = '0055'`
- **Result**: Mengembalikan semua objek pajak dengan `kdKelurahan = '006'` dan `noUrut = '0055'`, termasuk yang memiliki `kdBlok` berbeda (`001`, `002`, dll.)

## Solution
Mengubah frontend untuk menggunakan endpoint yang lebih spesifik:
```
GET /api/dat-objek-pajak/{kdPropinsi}/{kdDati2}/{kdKecamatan}/{kdKelurahan}/{kdBlok}/{noUrut}/{kdJnsOp}
```

Endpoint ini mengembalikan **satu** objek pajak yang spesifik berdasarkan semua parameter.

### Example:
- **URL**: `/35/08/100/006/001/0055/0`
- **Query**: `WHERE KD_PROPINSI = '35' AND KD_DATI2 = '08' AND KD_KECAMATAN = '100' AND KD_KELURAHAN = '006' AND KD_BLOK = '001' AND NO_URUT = '0055' AND KD_JNS_OP = '0'`
- **Result**: Mengembalikan **satu** objek pajak yang spesifik

## Changes Made

### 1. **Updated Map Click Handler** (`bidang-map.component.ts`):
```typescript
// BEFORE
layer.on('click', (e) => {
  this.loadObjekPajakData(
    props.kd_prop,
    props.kd_dati2, 
    props.kd_kec,
    props.kd_kel,
    props.no_urut
  );
});

// AFTER
layer.on('click', (e) => {
  this.loadObjekPajakData(
    props.kd_prop,
    props.kd_dati2, 
    props.kd_kec,
    props.kd_kel,
    props.kd_blok,    // Added
    props.no_urut,
    props.kd_jns_op   // Added
  );
});
```

### 2. **Updated Method Signature** (`bidang-map.component.ts`):
```typescript
// BEFORE
loadObjekPajakData(kdProp: string, kdDati2: string, kdKec: string, kdKel: string, noUrut: string): void

// AFTER
loadObjekPajakData(kdProp: string, kdDati2: string, kdKec: string, kdKel: string, kdBlok: string, noUrut: string, kdJnsOp: string): void
```

### 3. **Updated API Call** (`bidang-map.component.ts`):
```typescript
// BEFORE
this.restApiService.getDatObjekPajakDetail(kdProp, kdDati2, kdKec, kdKel, noUrut).subscribe({

// AFTER
this.restApiService.getDatObjekPajakById(kdProp, kdDati2, kdKec, kdKel, kdBlok, noUrut, kdJnsOp).subscribe({
```

### 4. **Updated Response Handling** (`bidang-map.component.ts`):
```typescript
// BEFORE
this.objekPajakData = response.data || [];

// AFTER
this.objekPajakData = response.objekPajak ? [response.objekPajak] : [];
```

### 5. **Updated Popup Button** (`bidang-map.component.ts`):
```html
<!-- BEFORE -->
<button onclick="window.loadObjekPajakData('${props.kd_prop}', '${props.kd_dati2}', '${props.kd_kec}', '${props.kd_kel}', '${props.no_urut}')">

<!-- AFTER -->
<button onclick="window.loadObjekPajakData('${props.kd_prop}', '${props.kd_dati2}', '${props.kd_kec}', '${props.kd_kel}', '${props.kd_blok}', '${props.no_urut}', '${props.kd_jns_op}')">
```

## API Endpoints Comparison

### 1. **Detail Endpoint** (Multiple Results):
```
GET /api/dat-objek-pajak/detail/{kdPropinsi}/{kdDati2}/{kdKecamatan}/{kdKelurahan}/{noUrut}
```
- **Purpose**: Get all objek pajak with same location and sequence
- **Response**: Array of objek pajak
- **Use Case**: When you want to see all objek pajak in a specific location

### 2. **Specific Endpoint** (Single Result):
```
GET /api/dat-objek-pajak/{kdPropinsi}/{kdDati2}/{kdKecamatan}/{kdKelurahan}/{kdBlok}/{noUrut}/{kdJnsOp}
```
- **Purpose**: Get specific objek pajak with exact match
- **Response**: Single objek pajak object
- **Use Case**: When you want to see specific objek pajak from map click

## Response Format Differences

### Detail Endpoint Response:
```json
{
  "data": [
    {
      "kdPropinsi": "35",
      "kdDati2": "08",
      "kdKecamatan": "100",
      "kdKelurahan": "006",
      "kdBlok": "001",
      "noUrut": "0055",
      "kdJnsOp": "0",
      // ... other fields
    },
    {
      "kdPropinsi": "35",
      "kdDati2": "08",
      "kdKecamatan": "100",
      "kdKelurahan": "006",
      "kdBlok": "002",
      "noUrut": "0055",
      "kdJnsOp": "0",
      // ... other fields
    }
  ],
  "success": true,
  "totalCount": 2
}
```

### Specific Endpoint Response:
```json
{
  "objekPajak": {
    "kdPropinsi": "35",
    "kdDati2": "08",
    "kdKecamatan": "100",
    "kdKelurahan": "006",
    "kdBlok": "001",
    "noUrut": "0055",
    "kdJnsOp": "0",
    // ... other fields
  },
  "subjekPajak": {
    // ... subjek pajak data if available
  },
  "success": true,
  "message": "Data objek pajak berhasil diambil"
}
```

## Benefits of the Fix

1. **Precise Results**: Now returns the exact objek pajak that was clicked
2. **Better Performance**: Single record lookup instead of multiple records
3. **Consistent Data**: `kdBlok` in URL matches `kdBlok` in response
4. **Subjek Pajak Integration**: Response includes related subjek pajak data
5. **Clearer Intent**: Code clearly shows we want specific objek pajak

## Testing

### Test URL:
```
http://localhost:8080/api/dat-objek-pajak/35/08/100/006/001/0055/0
```

### Expected Result:
- Single objek pajak with `kdBlok = '001'`
- Includes subjek pajak data if available
- `kdBlok` in URL matches `kdBlok` in response

## Files Modified

1. `src/app/pages/bidang/bidang-map/bidang-map.component.ts`
   - Updated `loadObjekPajakData()` method signature
   - Updated map click handler
   - Updated popup button
   - Updated API call and response handling

## Future Considerations

1. **Fallback Strategy**: If specific lookup fails, fallback to detail endpoint
2. **Error Handling**: Better error messages for missing data
3. **Validation**: Validate that all required parameters are present
4. **Caching**: Cache results for better performance
