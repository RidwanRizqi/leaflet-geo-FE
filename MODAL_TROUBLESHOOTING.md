# Modal Troubleshooting Guide

## Problem: Data tidak muncul di modal objek pajak

### Symptoms:
- Modal terbuka tapi tidak menampilkan data
- Debug info menunjukkan data length = 0
- Console log menunjukkan response ada tapi data tidak ter-render

### Root Cause Analysis:

#### 1. **Response Structure Mismatch**
Backend mengembalikan:
```json
{
  "data": [...],
  "success": true,
  "filters": {...},
  "message": "...",
  "totalCount": 5
}
```

#### 2. **Service Mapping Issue**
Service melakukan mapping yang salah:
```typescript
// WRONG - extracts data too early
.pipe(map((response) => response.data || response));

// CORRECT - return full response
.pipe(map((response) => response));
```

#### 3. **Component Data Extraction**
Component harus extract data dari response:
```typescript
// CORRECT
this.objekPajakData = response.data || [];
```

### Solution Applied:

#### 1. **Fixed Service Mapping**
```typescript
getDatObjekPajakDetail(kdProp: string, kdDati2: string, kdKec: string, kdKel: string, noUrut: string): Observable<any> {
    return this.http.get<any>(this.apiUrl + `dat-objek-pajak/detail/${kdProp}/${kdDati2}/${kdKec}/${kdKel}/${noUrut}`)
        .pipe(map((response) => {
            // Return the full response object, not just data
            return response;
        }));
}
```

#### 2. **Fixed Component Data Extraction**
```typescript
next: (response: any) => {
    console.log('Objek pajak response:', response);
    // Extract data array from response
    this.objekPajakData = response.data || [];
    this.isLoadingObjekPajak = false;
    console.log('Objek pajak data set:', this.objekPajakData);
    console.log('Data length:', this.objekPajakData.length);
}
```

#### 3. **Added Debug Information**
```html
<!-- Debug Info -->
<div *ngIf="!isLoadingObjekPajak" class="alert alert-warning">
    <i class="ri-bug-line me-2"></i>
    <strong>Debug Info:</strong> 
    Data length: {{ objekPajakData.length }}, 
    Show modal: {{ showObjekPajakModal }}, 
    Loading: {{ isLoadingObjekPajak }}
</div>
```

### Testing Steps:

#### 1. **Test API Endpoint**
```bash
curl -X GET "http://localhost:8080/api/dat-objek-pajak/detail/35/08/061/003/0335"
```

Expected response:
```json
{
  "data": [
    {
      "kdPropinsi": "35",
      "kdDati2": "08",
      "kdKecamatan": "061",
      "kdKelurahan": "003",
      "kdBlok": "002",
      "noUrut": "0335",
      "kdJnsOp": "0",
      "subjekPajakId": "3508211604800001",
      "noFormulirSpop": "20170019178",
      "totalLuasBumi": 234,
      "totalLuasBng": 50,
      "njopBumi": 56862000,
      "njopBng": 29750000,
      "jalanOp": "DSN KRAJAN",
      "rtOp": "009",
      "rwOp": "03"
    }
  ],
  "success": true,
  "totalCount": 5
}
```

#### 2. **Test Frontend Modal**
1. Open browser console
2. Click on bidang in map
3. Check console logs:
   - "Loading objek pajak data for: ..."
   - "Objek pajak response: ..."
   - "Objek pajak data set: ..."
   - "Data length: ..."

#### 3. **Check Debug Info in Modal**
Modal should show:
- Data length: > 0
- Show modal: true
- Loading: false

### Common Issues:

#### 1. **Data Length = 0**
- Check if `response.data` exists
- Verify API endpoint returns correct structure
- Check console for errors

#### 2. **Modal Not Opening**
- Check if `showObjekPajakModal = true`
- Verify click handler is attached
- Check for JavaScript errors

#### 3. **Data Not Rendering**
- Check if `objekPajakData` array has items
- Verify HTML template conditions
- Check for Angular binding errors

### Debug Commands:

#### 1. **Check Service Response**
```typescript
console.log('Service response:', response);
console.log('Response type:', typeof response);
console.log('Response.data:', response.data);
console.log('Is array:', Array.isArray(response.data));
```

#### 2. **Check Component State**
```typescript
console.log('objekPajakData:', this.objekPajakData);
console.log('showObjekPajakModal:', this.showObjekPajakModal);
console.log('isLoadingObjekPajak:', this.isLoadingObjekPajak);
```

#### 3. **Check HTML Binding**
```html
<!-- Add this to see raw data -->
<pre>{{ objekPajakData | json }}</pre>
```

### Files Modified:

1. `src/app/core/services/rest-api.service.ts`
   - Fixed `getDatObjekPajakDetail()` mapping

2. `src/app/pages/bidang/bidang-map/bidang-map.component.ts`
   - Fixed data extraction in `loadObjekPajakData()`
   - Added debug logging

3. `src/app/pages/bidang/bidang-map/bidang-map.component.html`
   - Added debug information display

### Test File:
- `test-modal.html` - Standalone test for modal functionality

### Expected Behavior After Fix:

1. **User clicks bidang on map**
2. **Modal opens immediately** (showObjekPajakModal = true)
3. **Loading spinner shows** (isLoadingObjekPajak = true)
4. **API call made** to `/api/dat-objek-pajak/detail/...`
5. **Response received** with data array
6. **Data extracted** to objekPajakData
7. **Loading stops** (isLoadingObjekPajak = false)
8. **Cards render** with objek pajak information
9. **Debug info shows** correct data length

### Verification Checklist:

- [ ] API endpoint returns correct response structure
- [ ] Service returns full response object
- [ ] Component extracts data from response.data
- [ ] objekPajakData array is populated
- [ ] Modal opens and shows data
- [ ] Cards display with correct information
- [ ] Debug info shows correct values
- [ ] No console errors
- [ ] No Angular binding errors
