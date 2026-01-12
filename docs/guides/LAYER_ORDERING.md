# Leaflet Layer Ordering

## Layer Stack (dari bawah ke atas)

```
┌─────────────────────────────────┐
│   3. BIDANG LAYER (paling atas) │  ← Polygon bidang pajak
│      - Color: #3388ff (biru)    │  ← Dapat diklik untuk detail
│      - Weight: 2                 │  ← Tooltip on hover
│      - fillOpacity: 0.3          │
├─────────────────────────────────┤
│   2. BOUNDARY LAYER             │  ← Boundary administratif
│      - Kabupaten: #ff6b6b (merah)│  ← Kelurahan/Kecamatan/Kabupaten
│      - Kecamatan: #4CAF50 (hijau)│  ← Dibawah bidang agar tidak
│      - Kelurahan: #2196F3 (biru) │     menutupi bidang
│      - Weight: 3                 │
│      - fillOpacity: 0.1-0.2      │
├─────────────────────────────────┤
│   1. BASE MAP (paling bawah)    │  ← OpenStreetMap tiles
│      - Tile layer                │
└─────────────────────────────────┘
```

## Implementasi Layer Ordering

### Boundary Layer (Selalu di Bawah)
```typescript
this.boundaryLayer.addTo(this.map);
this.boundaryLayer.bringToBack(); // ✅ Pindahkan ke belakang
```

### Bidang Layer (Selalu di Atas)
```typescript
this.geoJsonLayer.addTo(this.map);
this.geoJsonLayer.bringToFront(); // ✅ Pindahkan ke depan

// Pastikan boundary tetap di belakang
if (this.boundaryLayer) {
  this.boundaryLayer.bringToBack();
}
```

## Kenapa Ordering Penting?

1. **User Experience**
   - Bidang harus bisa diklik untuk melihat detail objek pajak
   - Boundary sebagai referensi konteks, tidak perlu interaksi prioritas

2. **Visual Clarity**
   - Boundary dengan opacity rendah (0.1-0.2) sebagai background
   - Bidang dengan opacity lebih tinggi (0.3) sebagai foreground
   - Hindari boundary menutupi bidang yang lebih kecil

3. **Performance**
   - Layer ordering menggunakan CSS z-index, sangat cepat
   - Tidak perlu re-render entire map

## Methods Used

- `layer.bringToBack()` - Pindahkan layer ke paling bawah
- `layer.bringToFront()` - Pindahkan layer ke paling atas
- `layer.setZIndex(index)` - Set z-index spesifik (alternatif)

## Testing

Cek layer ordering dengan:
1. Load kabupaten boundary (merah) → Harus di bawah
2. Pilih kelurahan → Load bidang 
3. Bidang (biru #3388ff) harus menutupi boundary
4. Klik bidang → Modal harus muncul (tidak terhalangi boundary)

## Color Scheme Summary

| Layer Type | Color | Hex | Opacity |
|------------|-------|-----|---------|
| Kabupaten | Merah | #ff6b6b | 0.1 |
| Kecamatan | Hijau | #4CAF50 | 0.15 |
| Kelurahan | Biru | #2196F3 | 0.2 |
| Bidang | Biru | #3388ff | 0.3 |
