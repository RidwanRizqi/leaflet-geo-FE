# Bidang Map Filter Update

## Overview
Updated the `bidang-map` component to implement location-based filtering where users must select a kecamatan first, then optionally select a kelurahan, before loading bidang data.

## Changes Made

### 1. Component TypeScript (`bidang-map.component.ts`)

#### Added Imports
- `FormsModule` for two-way data binding with dropdowns

#### Added Properties
```typescript
// Dropdown data
kecamatanList: any[] = [];
kelurahanList: any[] = [];
selectedKecamatan: any = null;
selectedKelurahan: any = null;
isLoadingKecamatan = false;
isLoadingKelurahan = false;
isLoadingBidang = false;
```

#### Added Methods
- `loadKecamatanData()` - Loads all kecamatan data on component init
- `loadKelurahanData()` - Loads kelurahan data based on selected kecamatan
- `loadBidangData()` - Loads bidang data based on selected kecamatan/kelurahan
- `onKecamatanChange()` - Handles kecamatan dropdown change
- `onKelurahanChange()` - Handles kelurahan dropdown change
- `clearMap()` - Clears map data
- `loadBidangByKecamatan()` - Loads bidang data for selected kecamatan only

#### Modified Methods
- `ngOnInit()` - Now loads kecamatan data instead of bidang data
- `ngAfterViewInit()` - Removed automatic bidang data loading
- `loadBidangData()` - Updated to use filtered endpoints based on selection

### 2. Component HTML (`bidang-map.component.html`)

#### Added Filter Controls Section
```html
<!-- Filter Controls -->
<div class="row mb-3">
  <div class="col-md-4">
    <!-- Kecamatan Dropdown -->
  </div>
  <div class="col-md-4">
    <!-- Kelurahan Dropdown -->
  </div>
  <div class="col-md-4">
    <!-- Action Buttons -->
  </div>
</div>
```

#### Features
- **Kecamatan Dropdown**: Shows all available kecamatan with loading state
- **Kelurahan Dropdown**: Populated based on selected kecamatan, disabled when no kecamatan selected
- **Load Data Button**: Loads bidang data for selected kecamatan
- **Clear Map Button**: Clears current map data
- **Loading States**: Shows loading indicators for each operation
- **Data Info**: Displays selected location information

### 3. Service Updates (`rest-api.service.ts`)

#### Added Ref Kecamatan APIs
- `getRefKecamatan()` - Get all kecamatan
- `getRefKecamatanById()` - Get kecamatan by ID
- `getRefKecamatanByPropinsi()` - Get kecamatan by province
- `getRefKecamatanByPropinsiAndDati2()` - Get kecamatan by province and dati2
- `searchRefKecamatan()` - Search kecamatan by name

#### Added Ref Kelurahan APIs
- `getRefKelurahan()` - Get all kelurahan
- `getRefKelurahanById()` - Get kelurahan by ID
- `getRefKelurahanByKecamatan()` - Get kelurahan by kecamatan
- `getRefKelurahanByPropinsi()` - Get kelurahan by province
- `getRefKelurahanByPropinsiAndDati2()` - Get kelurahan by province and dati2
- `searchRefKelurahan()` - Search kelurahan by name
- `getRefKelurahanBySektor()` - Get kelurahan by sector
- `getRefKelurahanByPosKelurahan()` - Get kelurahan by postal code

#### Added Bidang Filtered APIs
- `getBidangByKecamatan()` - Get bidang by kecamatan
- `getBidangByKelurahan()` - Get bidang by kelurahan
- `getBidangByKecamatanGeometry()` - Get bidang with geometry by kecamatan
- `getBidangByKelurahanGeometry()` - Get bidang with geometry by kelurahan
- `searchBidang()` - Search bidang with flexible parameters

### 4. Component Styling (`bidang-map.component.scss`)

#### Added Styles
- **Spinner Animation**: `.spin` class with rotating animation
- **Form Controls**: Enhanced styling for dropdowns and labels
- **Button States**: Disabled state styling
- **Alert Styling**: Success and error alert styling

## User Flow

1. **Component Initialization**
   - Loads kecamatan data automatically
   - Initializes map without data

2. **Kecamatan Selection**
   - User selects kecamatan from dropdown
   - Automatically loads kelurahan data for selected kecamatan
   - Clears previous map data

3. **Kelurahan Selection (Optional)**
   - User can optionally select kelurahan
   - If selected, loads bidang data for specific kelurahan
   - If not selected, can load data for entire kecamatan

4. **Data Loading**
   - User clicks "Load Data" button
   - Loads bidang data based on selection
   - Displays data on map with pagination

## API Endpoints Used

### Backend Endpoints
- `GET /api/ref-kecamatan` - Get all kecamatan
- `GET /api/ref-kelurahan/propinsi/{kdPropinsi}/dati2/{kdDati2}/kecamatan/{kdKecamatan}` - Get kelurahan by kecamatan
- `GET /api/bidang/kecamatan/{kdProp}/{kdDati2}/{kdKec}/geometry` - Get bidang by kecamatan with geometry
- `GET /api/bidang/kelurahan/{kdProp}/{kdDati2}/{kdKec}/{kdKel}/geometry` - Get bidang by kelurahan with geometry

## Benefits

1. **Performance**: Only loads data for selected location instead of all data
2. **User Experience**: Clear step-by-step process for data selection
3. **Flexibility**: Users can choose to view data by kecamatan only or by specific kelurahan
4. **Scalability**: Handles large datasets efficiently with pagination
5. **Intuitive**: Natural hierarchy (kecamatan → kelurahan → bidang)

## Dependencies

- Angular FormsModule for two-way data binding
- Existing RestApiService for API calls
- Leaflet for map visualization
- Bootstrap for UI components
