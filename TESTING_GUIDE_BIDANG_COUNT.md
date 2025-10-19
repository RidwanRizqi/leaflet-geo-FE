# 🎯 Quick Testing Guide - Kecamatan Labels with Bidang Count

## ✅ Status Check

**Backend (Spring Boot):**
- ✅ Running on `http://localhost:8080`
- PID: 22964

**Frontend (Angular):**
- ✅ Running on `http://localhost:4200`
- PID: 18896

---

## 🚀 Quick Test Steps

### 1. Open Browser
```
URL: http://localhost:4200
```

### 2. Navigate to Bidang Map
```
Menu: Bidang → Bidang Map
```

### 3. Visual Checklist

#### Initial Map Load:
```
Expected Result:
┌────────────────────────────────────────────────┐
│  Bidang Map View                               │
│                                                 │
│  Map with kecamatan boundaries showing:        │
│                                                 │
│  ╔══════════════╗                              │
│  ║ YOSOWILANGUN ║  ← Nama Kecamatan (Bold)     │
│  ║ 0 Bidang     ║  ← Jumlah Bidang (Blue)      │
│  ╚══════════════╝                              │
│                                                 │
│  ╔══════════════╗     ╔═══════════╗            │
│  ║ TEMPUR SARI  ║     ║ PRONOJIWO ║            │
│  ║ 0 Bidang     ║     ║ 0 Bidang  ║            │
│  ╚══════════════╝     ╚═══════════╝            │
│                                                 │
└────────────────────────────────────────────────┘
```

#### Label Details:
- **Line 1:** Kecamatan name
  - Font: Bold, 11px
  - Color: Dark blue-gray (#2c3e50)
  - Style: Uppercase
  
- **Line 2:** Bidang count
  - Font: Semi-bold, 10px
  - Color: Blue (#2563eb)
  - Format: Indonesian number (e.g., "1.250 Bidang")

#### Label Box:
- **Background:** White with 95% opacity
- **Border:** 2px solid dark blue-gray
- **Border Radius:** 6px
- **Shadow:** Soft drop shadow
- **Size:** Min 120px, Max 180px

---

## 🧪 Detailed Testing

### Test 1: Data Merging ✅
**Goal:** Verify bidang count matches kecamatan

**Steps:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for logs:
   ```
   📡 Received BPRD boundaries data: (21) [...]
   Kecamatan list loaded: 21 items
   ```
4. Hover over a kecamatan label
5. Click to open popup
6. Verify "Jumlah Bidang" in popup matches label

**Expected:**
- Console shows both datasets loaded
- No errors in console
- Bidang count in label = Bidang count in popup

---

### Test 2: Visual Appearance ✅
**Goal:** Verify styling is correct

**Steps:**
1. Check label has 2 distinct lines
2. Check kecamatan name is UPPERCASE and bold
3. Check bidang count is blue and smaller
4. Check white background is visible
5. Check border is visible and dark

**Expected:**
```
Visual Checklist:
✅ Two separate lines clearly visible
✅ Name is bold and uppercase
✅ Count is blue (#2563eb)
✅ White background (not transparent)
✅ Dark border (2px solid)
✅ Rounded corners (6px)
✅ Shadow visible
```

---

### Test 3: Number Formatting ✅
**Goal:** Verify Indonesian number format

**Test Cases:**
| Raw Number | Expected Display |
|------------|------------------|
| 0          | 0 Bidang         |
| 125        | 125 Bidang       |
| 1250       | 1.250 Bidang     |
| 12500      | 12.500 Bidang    |

**Steps:**
1. Look at different kecamatan labels
2. Check number format uses dots (.) for thousands
3. Check "Bidang" word appears after number

**Expected:**
- Numbers > 999 have dot separator
- Format: `X.XXX Bidang`

---

### Test 4: Interactive Features ✅
**Goal:** Verify hover and click work

**Steps:**
1. **Hover Test:**
   - Move mouse over label
   - Label should scale up slightly
   - Shadow should become more prominent
   - Opacity should increase to 100%

2. **Click Test:**
   - Click on label (or polygon)
   - Popup should appear
   - Popup should show same bidang count
   - Popup should have formatted number

**Expected:**
```
Hover:
- Scale: 1.05x
- Opacity: 1.0
- Shadow: Stronger

Click:
- Popup opens
- Shows kecamatan details
- Bidang count matches label
```

---

### Test 5: Toggle Functionality ✅
**Goal:** Verify show/hide labels works

**Steps:**
1. Look for toggle button (top right)
2. Button should say "Hide Labels"
3. Click button
4. All labels disappear
5. Button changes to "Show Labels"
6. Click again
7. Labels reappear with same data

**Expected:**
```
Initial State:
- Button: "Hide Labels"
- Labels: Visible

After Click 1:
- Button: "Show Labels"
- Labels: Hidden

After Click 2:
- Button: "Hide Labels"
- Labels: Visible (restored)
```

---

### Test 6: Responsive Design ✅
**Goal:** Verify labels work on different screen sizes

**Steps:**
1. Open DevTools (F12)
2. Click device toolbar icon (Ctrl+Shift+M)
3. Test different devices:
   - Desktop (1920x1080)
   - Tablet (768x1024)
   - Mobile (375x667)

**Expected:**
| Device  | Name Font | Count Font | Padding | Min Width |
|---------|-----------|------------|---------|-----------|
| Desktop | 11px      | 10px       | 6px 12px| 120px     |
| Tablet  | 11px      | 10px       | 6px 12px| 120px     |
| Mobile  | 9px       | 8px        | 4px 8px | 100px     |

---

### Test 7: Edge Cases ✅
**Goal:** Test unusual scenarios

**Test Cases:**

1. **Zero Bidang:**
   - Expected: "0 Bidang" (not blank or error)
   
2. **Large Numbers:**
   - Expected: Proper formatting (e.g., "10.000 Bidang")
   
3. **Long Kecamatan Names:**
   - Expected: Name wraps if needed, doesn't overflow
   
4. **Missing Data:**
   - Expected: Shows 0 if no match found
   
5. **Zoom Levels:**
   - Expected: Labels visible at all zoom levels
   - Expected: Labels scale appropriately

---

## 🐛 Troubleshooting

### Issue: All labels show "0 Bidang"

**Check:**
```javascript
// In browser console:
console.log('Kecamatan list:', this.kecamatanList);
console.log('Boundaries:', this.bprdKecamatanData);
```

**Solutions:**
1. ✅ Verify `/api/bidang/kecamatan-with-count/35/08` returns data
2. ✅ Verify `kd_kec` matches `kdKecamatan`
3. ✅ Check kecamatanList loaded before boundaries

**API Test:**
```powershell
# Test endpoint directly
Invoke-RestMethod -Uri "http://localhost:8080/api/bidang/kecamatan-with-count/35/08"
```

---

### Issue: Labels are single-line only

**Check CSS:**
```scss
::ng-deep .kecamatan-label {
  white-space: normal; // Should be normal, not nowrap
}
```

**Fix:**
1. Open `thematic-map.component.scss`
2. Find `.kecamatan-label`
3. Verify `white-space: normal`
4. Save and refresh browser

---

### Issue: Labels not visible

**Checklist:**
- [ ] `showKecamatanLabels` is true
- [ ] CSS has correct opacity (0.9 or 1.0)
- [ ] Labels not behind polygons (z-index)
- [ ] Toggle button not clicked (hiding labels)

**Console Check:**
```javascript
// Type in browser console:
this.showKecamatanLabels // Should be true
```

---

### Issue: Numbers not formatted

**Check:**
```typescript
// Should use toLocaleString
jumlahBidang.toLocaleString('id-ID')

// Not just:
jumlahBidang.toString()
```

**Test:**
```javascript
// In browser console:
(1250).toLocaleString('id-ID') // Should output: "1.250"
```

---

## 📊 Data Verification

### Backend Endpoints Test:

#### Test 1: Kecamatan with Count
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/bidang/kecamatan-with-count/35/08" | ConvertTo-Json -Depth 10
```

**Expected Response:**
```json
{
  "message": "Kecamatan with count retrieved successfully",
  "data": [
    {
      "kdPropinsi": "35",
      "jumlahBidang": 0,
      "kdKecamatan": "010",
      "kdDati2": "08",
      "nmKecamatan": "TEMPUR SARI"
    },
    ...
  ]
}
```

**Verify:**
- ✅ Response has `data` array
- ✅ Each item has `kdKecamatan`
- ✅ Each item has `jumlahBidang`
- ✅ Each item has `nmKecamatan`

---

#### Test 2: BPRD Boundaries
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/bprd/boundaries" | Select-Object -First 1 | ConvertTo-Json -Depth 10
```

**Expected Response:**
```json
{
  "id": "f803a91b-4095-4728-86ca-80331cecdd62",
  "nama": "YOSOWILANGUN",
  "color": "RGBA(189, 183, 107, 0.5)",
  "geojson": {
    "coordinates": [...],
    "type": "MultiPolygon"
  },
  "kd_kec": "090",
  "is_active": true
}
```

**Verify:**
- ✅ Response is array
- ✅ Each item has `nama`
- ✅ Each item has `kd_kec`
- ✅ Each item has `geojson` object
- ✅ `geojson` has `type` and `coordinates`

---

### Data Matching Test:

**Compare kd_kec values:**
```powershell
# Get all kd_kec from boundaries
$boundaries = Invoke-RestMethod -Uri "http://localhost:8080/api/bprd/boundaries"
$boundaries | ForEach-Object { $_.kd_kec } | Sort-Object

# Get all kdKecamatan from list
$kecamatanList = (Invoke-RestMethod -Uri "http://localhost:8080/api/bidang/kecamatan-with-count/35/08").data
$kecamatanList | ForEach-Object { $_.kdKecamatan } | Sort-Object
```

**Expected:**
- Both lists should have matching codes
- Format should be identical (e.g., "010" vs "010")
- All codes from boundaries should exist in kecamatan list

---

## ✨ Success Criteria

### Visual Success:
```
✅ All kecamatan boundaries visible
✅ All labels have 2 lines (name + count)
✅ Name is bold, uppercase
✅ Count is blue, smaller font
✅ White background visible
✅ Dark border visible
✅ Shadow effect visible
✅ Labels centered on polygons
```

### Functional Success:
```
✅ Hover scales label up
✅ Click opens popup
✅ Popup shows same count
✅ Toggle button works
✅ Numbers formatted correctly
✅ No console errors
✅ Responsive on mobile
```

### Data Success:
```
✅ All kecamatan have labels
✅ Bidang count matches backend data
✅ Count updates when data changes
✅ Zero values display correctly
✅ Large numbers format properly
```

---

## 📸 Screenshot Checklist

For documentation, capture:

1. **Full Map View:**
   - All kecamatan boundaries visible
   - All labels visible
   - Different zoom level

2. **Label Close-up:**
   - Clear view of 2-line label
   - Shows styling details

3. **Hover State:**
   - Label scaled up
   - Shadow more prominent

4. **Popup View:**
   - Popup open showing bidang count
   - Matches label count

5. **Mobile View:**
   - Responsive sizing
   - Labels still readable

6. **Toggle States:**
   - Labels shown
   - Labels hidden

---

## 🎯 Performance Check

### Load Time:
- **Initial page load:** < 3 seconds
- **Map initialization:** < 1 second
- **Labels rendering:** < 500ms
- **Toggle action:** < 300ms

### Network:
- **Kecamatan API call:** ~100ms
- **Boundaries API call:** ~500ms
- **Total data transfer:** ~500KB

### Memory:
- **Initial:** ~50MB
- **After labels:** ~60MB
- **Memory leak:** None (check after 5 min)

---

## 🚀 Final Verification

Run this complete test sequence:

1. ✅ Open `http://localhost:4200`
2. ✅ Navigate to Bidang Map
3. ✅ Wait for map to load
4. ✅ Verify all labels visible
5. ✅ Check 2-line format
6. ✅ Hover over 3 different labels
7. ✅ Click 3 different labels
8. ✅ Verify popup bidang count
9. ✅ Click toggle button twice
10. ✅ Zoom in and out
11. ✅ Switch to mobile view
12. ✅ Check browser console for errors

**If all ✅, feature is working perfectly!** 🎉

---

## 📝 Report Template

```
Test Date: _______
Tester: _______

Visual Tests:
[ ] Labels have 2 lines
[ ] Styling correct (colors, fonts, border)
[ ] Centered on polygons

Functional Tests:
[ ] Hover effect works
[ ] Click opens popup
[ ] Toggle button works
[ ] Numbers formatted correctly

Data Tests:
[ ] Bidang count accurate
[ ] All kecamatan have labels
[ ] Zero values display correctly

Issues Found:
1. _______
2. _______

Overall Status: [ ] PASS  [ ] FAIL

Notes:
_______
```

---

**Happy Testing!** 🎉  
If you find any issues, check the troubleshooting section above.

**Support:** Check documentation in `KECAMATAN_BIDANG_COUNT_LABEL.md`
