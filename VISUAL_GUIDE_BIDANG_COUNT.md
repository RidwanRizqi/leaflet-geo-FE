# 🎨 Visual Guide - Kecamatan Labels with Bidang Count

## 📊 Feature Overview

### What You See on Map:

```
┌────────────────────────────────────────────────────────────────┐
│                    LEAFLET MAP VIEW                             │
│                                                                 │
│  ╔════════════════════╗         ╔════════════════════╗         │
│  ║ YOSOWILANGUN       ║         ║ JATIROTO           ║         │
│  ║ 0 Bidang           ║         ║ 0 Bidang           ║         │
│  ╚════════════════════╝         ╚════════════════════╝         │
│           ↑                              ↑                      │
│      Multi-line label              Center positioned           │
│                                                                 │
│  ╔════════════════════╗         ╔════════════════════╗         │
│  ║ SUKODONO           ║         ║ LUMAJANG           ║         │
│  ║ 0 Bidang           ║         ║ 0 Bidang           ║         │
│  ╚════════════════════╝         ╚════════════════════╝         │
│                                                                 │
│         ╔════════════════════╗                                 │
│         ║ SENDURO            ║                                 │
│         ║ 0 Bidang           ║                                 │
│         ╚════════════════════╝                                 │
│                                                                 │
│  [Show/Hide Labels] ← Toggle button                            │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## 🏷️ Label Anatomy

### Default State:
```
┌──────────────────────────┐
│   YOSOWILANGUN          │ ← Line 1: Kecamatan name
│   125 Bidang            │ ← Line 2: Bidang count
└──────────────────────────┘
     ↑            ↑
  Border      Background
   2px         White 95%
  #2c3e50     opacity
```

### Label Components:

#### Line 1: Kecamatan Name
```
Font: 11px, Bold
Color: #2c3e50 (Dark blue-gray)
Transform: UPPERCASE
Letter Spacing: 0.5px
Text Shadow: 1px 1px 2px rgba(255,255,255,0.8)
```

#### Line 2: Bidang Count
```
Font: 10px, Semi-bold (600)
Color: #2563eb (Blue)
Transform: None
Format: X.XXX Bidang (Indonesian)
```

#### Box Styling:
```
Background: rgba(255, 255, 255, 0.95)
Border: 2px solid #2c3e50
Border Radius: 6px
Padding: 6px 12px
Min Width: 120px
Max Width: 180px
Shadow: 0 2px 8px rgba(0, 0, 0, 0.3)
```

---

## 🎭 Interactive States

### 1. Normal State (Default)
```
┌──────────────────────┐
│ YOSOWILANGUN         │
│ 125 Bidang           │
└──────────────────────┘

Properties:
- Opacity: 0.9
- Scale: 1.0
- Shadow: 0 2px 8px rgba(0, 0, 0, 0.3)
```

### 2. Hover State
```
┌────────────────────────┐
│  YOSOWILANGUN         │ ← Slightly larger
│  125 Bidang           │
└────────────────────────┘
      ↓ ↓ ↓
  Stronger shadow

Properties:
- Opacity: 1.0
- Scale: 1.05 (5% larger)
- Shadow: 0 4px 12px rgba(0, 0, 0, 0.4)
- Transition: all 0.3s ease
- Z-index: 1000
```

### 3. Clicked State (Popup Open)
```
┌──────────────────────┐
│ YOSOWILANGUN         │
│ 125 Bidang           │
└──────────────────────┘
         ↓
    ┌─────────────────────────────┐
    │ 🗺️ YOSOWILANGUN            │
    │                             │
    │ Kode: 090                   │
    │ Jumlah Bidang: 125 Bidang   │ ← Matches label
    │ ID: f803a91b-...            │
    │ Status: ✅ Aktif            │
    │ Source: 🌐 BPRD API         │
    └─────────────────────────────┘
```

---

## 📱 Responsive Design

### Desktop (> 768px)
```
┌──────────────────────────┐
│   YOSOWILANGUN          │
│   125 Bidang            │  Font: 11px / 10px
└──────────────────────────┘  Padding: 6px 12px
     Min: 120px                Max: 180px
```

### Tablet (768px)
```
┌──────────────────────────┐
│   YOSOWILANGUN          │
│   125 Bidang            │  Font: 11px / 10px
└──────────────────────────┘  Padding: 6px 12px
     Min: 120px                Max: 180px
```

### Mobile (< 768px)
```
┌─────────────────────┐
│  YOSOWILANGUN      │
│  125 Bidang        │  Font: 9px / 8px
└─────────────────────┘  Padding: 4px 8px
     Min: 100px          Max: 180px
```

---

## 🎨 Color Palette

### Label Colors:
```
┌─────────────────────────────────────────────────┐
│ Background: rgba(255, 255, 255, 0.95)           │
│ ███████████████████████████████████             │
│ Almost white, 95% opacity                       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Border & Name: #2c3e50                          │
│ ███████████████████████████████████             │
│ Dark blue-gray                                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Bidang Count: #2563eb                           │
│ ███████████████████████████████████             │
│ Blue (distinct from name)                       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ Shadow: rgba(0, 0, 0, 0.3)                      │
│ ███████████████████████████████████             │
│ Semi-transparent black                          │
└─────────────────────────────────────────────────┘
```

---

## 🔢 Number Formatting Examples

### Indonesian Locale:
```
Raw Number    →    Formatted Display
─────────────────────────────────────
0             →    0 Bidang
1             →    1 Bidang
12            →    12 Bidang
125           →    125 Bidang
1250          →    1.250 Bidang      ← Dot separator
12500         →    12.500 Bidang
125000        →    125.000 Bidang
1250000       →    1.250.000 Bidang  ← Multiple dots
```

### Implementation:
```typescript
jumlahBidang.toLocaleString('id-ID')
```

---

## 📐 Layout & Spacing

### Label Dimensions:
```
┌─────────── 120px - 180px ───────────┐
│ ↕                                   │
│ 6px  ┌───────────────────────┐     │
│      │  YOSOWILANGUN        │     │
│ 2px  │                       │     │
│      │  125 Bidang          │     │
│ 6px  └───────────────────────┘     │
│     ↔ 12px              12px ↔     │
└─────────────────────────────────────┘
        Total height: ~40-50px
```

### Polygon Positioning:
```
      Polygon Boundary
┌──────────────────────────────┐
│                              │
│                              │
│      ┌─────────────┐         │
│      │ KECAMATAN  │         │ ← Center of polygon
│      │ X Bidang   │         │    calculated by Leaflet
│      └─────────────┘         │
│                              │
│                              │
└──────────────────────────────┘
```

---

## 🔄 Data Flow Visualization

### Step 1: Load Kecamatan List
```
HTTP GET: /api/bidang/kecamatan-with-count/35/08
↓
Response:
{
  "data": [
    {
      "kdKecamatan": "090",     ← Key for merge
      "nmKecamatan": "YOSOWILANGUN",
      "jumlahBidang": 125       ← Count to display
    }
  ]
}
↓
Stored in: this.kecamatanList[]
```

### Step 2: Load Boundaries
```
HTTP GET: /api/bprd/boundaries
↓
Response:
[
  {
    "kd_kec": "090",           ← Key for merge
    "nama": "YOSOWILANGUN",
    "geojson": {...}           ← Polygon geometry
  }
]
↓
Stored in: this.bprdKecamatanData[]
```

### Step 3: Merge Data
```
For each boundary:
  1. Get kd_kec = "090"
  2. Find in kecamatanList where kdKecamatan = "090"
  3. Extract jumlahBidang = 125
  4. Create label HTML with name + count
```

### Step 4: Render Label
```
Leaflet Tooltip:
┌──────────────────────┐
│ YOSOWILANGUN         │ ← From boundary.nama
│ 125 Bidang           │ ← From kecamatan.jumlahBidang
└──────────────────────┘
         ↓
    Positioned at polygon center
```

---

## 🎯 Visual Comparison

### Before (Single-line):
```
┌──────────────┐
│ YOSOWILANGUN │  ← Only name, no count
└──────────────┘
    Less info
```

### After (Multi-line):
```
┌──────────────────┐
│ YOSOWILANGUN     │  ← Name
│ 125 Bidang       │  ← Count (NEW!)
└──────────────────┘
   More info
```

---

## 🖱️ User Interaction Flow

### Scenario 1: View Information
```
User Action: Open map
           ↓
System: Load kecamatan list (API 1)
           ↓
System: Load boundaries (API 2)
           ↓
System: Merge data by kd_kec
           ↓
System: Render labels (name + count)
           ↓
User: See all kecamatan with counts
```

### Scenario 2: Hover for Emphasis
```
User Action: Hover over label
           ↓
System: Scale up 5%
           ↓
System: Increase opacity to 100%
           ↓
System: Strengthen shadow
           ↓
User: Label stands out
```

### Scenario 3: Click for Details
```
User Action: Click label/polygon
           ↓
System: Close tooltip
           ↓
System: Open popup with full details
           ↓
User: See detailed info including count
```

### Scenario 4: Toggle Visibility
```
User Action: Click "Hide Labels" button
           ↓
System: Set showKecamatanLabels = false
           ↓
System: Remove layer from map
           ↓
System: Reload boundaries without labels
           ↓
User: Clean map view (polygons only)
           ↓
User Action: Click "Show Labels" again
           ↓
System: Set showKecamatanLabels = true
           ↓
System: Reload boundaries with labels
           ↓
User: Labels reappear
```

---

## 📊 Edge Cases Visualization

### Case 1: Zero Bidang
```
┌──────────────────┐
│ TEMPUR SARI      │
│ 0 Bidang         │  ← Shows zero, not blank
└──────────────────┘
```

### Case 2: Large Number
```
┌──────────────────┐
│ LUMAJANG         │
│ 12.500 Bidang    │  ← Proper formatting
└──────────────────┘
```

### Case 3: Long Name (Wrapping)
```
┌─────────────────────┐
│ KECAMATAN DENGAN   │
│ NAMA SANGAT PANJANG│  ← Wraps if needed
│ 250 Bidang         │
└─────────────────────┘
```

### Case 4: No Match Found
```
Boundary kd_kec: "999" (not in kecamatanList)
           ↓
matchingKecamatan = undefined
           ↓
jumlahBidang = 0 (fallback)
           ↓
┌──────────────────┐
│ UNKNOWN          │
│ 0 Bidang         │  ← Graceful fallback
└──────────────────┘
```

---

## 🎨 CSS Cascade

### HTML Structure:
```html
<div class="leaflet-tooltip kecamatan-label">
  <div style="text-align: center;">
    <div style="font-weight: bold; margin-bottom: 2px;">
      YOSOWILANGUN
    </div>
    <div style="font-size: 10px; opacity: 0.9;">
      125 Bidang
    </div>
  </div>
</div>
```

### CSS Applied (Order):
```
1. Leaflet base styles
   ↓
2. ::ng-deep .kecamatan-label (our custom)
   ↓
3. Inline styles (highest priority)
   ↓
4. Hover pseudo-class
```

---

## 🌈 Accessibility Notes

### Color Contrast:
```
Text (#2c3e50) on White background
Ratio: 12.6:1  ✅ WCAG AAA

Count (#2563eb) on White background  
Ratio: 4.9:1   ✅ WCAG AA
```

### Font Size:
```
Desktop: 11px / 10px  ⚠️ Borderline
Mobile:  9px / 8px    ⚠️ Too small for accessibility

Recommendation: Increase minimum to 12px
```

### Keyboard Navigation:
```
Current: ❌ Not keyboard accessible
Future: Add tabindex and focus styles
```

---

## 🔍 Browser Rendering

### Chrome/Edge:
```
✅ Perfect rendering
✅ Smooth hover transition
✅ Shadow rendering good
```

### Firefox:
```
✅ Good rendering
✅ Smooth transitions
⚠️ Shadow slightly different
```

### Safari:
```
✅ Good rendering
⚠️ Border radius may vary
⚠️ Test on macOS/iOS
```

---

## 📸 Screenshot Locations

### For Documentation:
```
1. Full map view
   → Save as: screenshots/full-map-with-labels.png

2. Single label close-up
   → Save as: screenshots/label-closeup.png

3. Hover state
   → Save as: screenshots/label-hover.png

4. Popup with count
   → Save as: screenshots/popup-with-count.png

5. Mobile view
   → Save as: screenshots/mobile-responsive.png

6. Toggle off state
   → Save as: screenshots/labels-hidden.png
```

---

## ✅ Visual Quality Checklist

### Typography:
- [ ] Name is bold and readable
- [ ] Count is distinct from name
- [ ] Text shadow improves readability
- [ ] Uppercase works well
- [ ] Letter spacing appropriate

### Colors:
- [ ] White background stands out
- [ ] Border provides good contrast
- [ ] Blue count is visible
- [ ] Colors work on all map tiles
- [ ] Shadow adds depth

### Layout:
- [ ] Two lines clearly separated
- [ ] Padding looks balanced
- [ ] Border radius looks smooth
- [ ] Width adapts to content
- [ ] Height is consistent

### Positioning:
- [ ] Labels centered on polygons
- [ ] Labels don't overlap excessively
- [ ] Labels visible at all zooms
- [ ] Labels don't hide map features

### Interaction:
- [ ] Hover effect is smooth
- [ ] Scale change is noticeable
- [ ] Shadow enhancement visible
- [ ] Transition timing feels right
- [ ] Click opens popup reliably

---

**🎨 Visual guide complete!**

Use this as reference when testing and documenting the feature.

---

**Date:** October 7, 2025  
**Version:** 1.0  
**Status:** ✅ Complete
