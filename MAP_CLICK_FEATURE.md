# Map Click Feature - Objek Pajak Integration

## Overview
Fitur baru yang memungkinkan user untuk mengklik bidang di map dan melihat data objek pajak terkait berdasarkan filter kd yang dipilih.

## How It Works

### 1. **Map Click Handler**
- Ketika user mengklik pada bidang di map, akan trigger `loadObjekPajakData()`
- Method ini menggunakan data dari properties bidang yang diklik:
  - `kd_prop` (Kode Provinsi)
  - `kd_dati2` (Kode Dati2) 
  - `kd_kec` (Kode Kecamatan)
  - `kd_kel` (Kode Kelurahan)
  - `no_urut` (No Urut)

### 2. **API Call**
- Memanggil endpoint: `GET /api/dat-objek-pajak/detail/{kdProp}/{kdDati2}/{kdKec}/{kdKel}/{noUrut}`
- Endpoint ini mengembalikan semua data objek pajak yang sesuai dengan filter tersebut

### 3. **Modal Display**
- Data ditampilkan dalam modal dengan layout card
- Setiap objek pajak ditampilkan dalam card terpisah
- User bisa klik card untuk select objek pajak tertentu

## Implementation Details

### Component Changes (`bidang-map.component.ts`)

#### New Properties:
```typescript
// Objek Pajak data
objekPajakData: any[] = [];
selectedObjekPajak: any = null;
isLoadingObjekPajak = false;
showObjekPajakModal = false;
```

#### New Methods:
```typescript
loadObjekPajakData(kdProp: string, kdDati2: string, kdKec: string, kdKel: string, noUrut: string): void
closeObjekPajakModal(): void
selectObjekPajak(objekPajak: any): void
```

#### Map Click Handler:
```typescript
// Add click handler to fetch objek pajak data
layer.on('click', (e) => {
  this.loadObjekPajakData(
    props.kd_prop,
    props.kd_dati2, 
    props.kd_kec,
    props.kd_kel,
    props.no_urut
  );
});
```

### Service Changes (`rest-api.service.ts`)

#### New API Methods:
```typescript
getDatObjekPajakDetail(kdProp: string, kdDati2: string, kdKec: string, kdKel: string, noUrut: string): Observable<any>
getDatObjekPajakById(kdProp: string, kdDati2: string, kdKec: string, kdKel: string, kdBlok: string, noUrut: string, kdJnsOp: string): Observable<any>
getDatSubjekPajakById(subjekPajakId: string): Observable<any>
```

### HTML Changes (`bidang-map.component.html`)

#### Enhanced Popup:
```html
<div class="mt-2">
  <button class="btn btn-sm btn-primary" onclick="window.loadObjekPajakData('${props.kd_prop}', '${props.kd_dati2}', '${props.kd_kec}', '${props.kd_kel}', '${props.no_urut}')">
    <i class="ri-file-list-line me-1"></i> Lihat Data Pajak
  </button>
</div>
```

#### Modal Structure:
```html
<!-- Objek Pajak Modal -->
<div *ngIf="showObjekPajakModal" class="modal fade show d-block">
  <div class="modal-dialog modal-xl">
    <div class="modal-content">
      <!-- Modal Header -->
      <!-- Modal Body with Data Cards -->
      <!-- Modal Footer -->
    </div>
  </div>
</div>
```

### CSS Changes (`bidang-map.component.scss`)

#### Modal Styling:
```scss
.modal {
  z-index: 1055;
  .modal-dialog { max-width: 90vw; }
  .modal-content { border-radius: 0.5rem; }
  .modal-body { max-height: 70vh; overflow-y: auto; }
}
```

#### Card Styling:
```scss
.card {
  transition: all 0.2s ease-in-out;
  &:hover { transform: translateY(-2px); }
  &.border-primary { border-color: #0d6efd !important; }
}
```

## User Flow

1. **User selects location filters** (kecamatan, kelurahan)
2. **User loads bidang data** on map
3. **User clicks on any bidang** on the map
4. **System fetches objek pajak data** based on bidang properties
5. **Modal opens** showing all related objek pajak data
6. **User can browse** through different objek pajak records
7. **User can select** specific objek pajak for detailed view
8. **User closes modal** when done

## Data Display

### Objek Pajak Card Information:
- **Basic Info**: Blok, Jenis OP, No Formulir, No Persil
- **Area Info**: Luas Bumi, Luas Bangunan
- **Value Info**: NJOP Bumi, NJOP Bangunan
- **Location Info**: Alamat, RT/RW, Koordinat

### Modal Features:
- **Responsive Layout**: Cards arranged in 2 columns
- **Loading State**: Spinner while fetching data
- **Empty State**: Message when no data found
- **Selection**: Visual feedback when card is selected
- **Scrollable**: Modal body scrolls when content is long

## API Endpoints Used

### Primary Endpoint:
```
GET /api/dat-objek-pajak/detail/{kdProp}/{kdDati2}/{kdKec}/{kdKel}/{noUrut}
```

**Response Format:**
```json
{
  "data": [
    {
      "kdPropinsi": "35",
      "kdDati2": "08",
      "kdKecamatan": "010",
      "kdKelurahan": "001",
      "kdBlok": "001",
      "noUrut": "0001",
      "kdJnsOp": "1",
      "subjekPajakId": "SP001",
      "noFormulirSpop": "12345678901",
      "totalLuasBumi": 100.50,
      "totalLuasBng": 75.25,
      "njopBumi": 50000000,
      "njopBng": 75000000,
      "jalanOp": "Jl. Contoh No. 123",
      "rtOp": "001",
      "rwOp": "01",
      "latitude": "-7.250445",
      "longitude": "112.768845"
    }
  ],
  "success": true,
  "message": "Data objek pajak berhasil diambil",
  "totalCount": 1
}
```

## Error Handling

- **Network Errors**: Display error message in modal
- **No Data**: Show empty state with appropriate message
- **Loading States**: Show spinner during API calls
- **Validation**: Check required parameters before API call

## Future Enhancements

1. **Subjek Pajak Integration**: Show related subjek pajak data
2. **Detailed View**: Expandable card for more information
3. **Export Feature**: Export objek pajak data to PDF/Excel
4. **Search/Filter**: Filter objek pajak within modal
5. **Map Integration**: Highlight selected objek pajak on map

## Testing

### Manual Testing Steps:
1. Load bidang data on map
2. Click on different bidang polygons
3. Verify modal opens with correct data
4. Test card selection functionality
5. Test modal close functionality
6. Test with different filter combinations

### Console Logs:
- Check browser console for API calls and responses
- Verify data mapping and display
- Monitor error handling

## Files Modified

1. `src/app/pages/bidang/bidang-map/bidang-map.component.ts`
2. `src/app/pages/bidang/bidang-map/bidang-map.component.html`
3. `src/app/pages/bidang/bidang-map/bidang-map.component.scss`
4. `src/app/core/services/rest-api.service.ts`

## Dependencies

- **Angular**: FormsModule for ngModel
- **Leaflet**: Map interaction and click events
- **Bootstrap**: Modal and card components
- **RxJS**: Observable handling for API calls
