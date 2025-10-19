# Bidang Geo Mapping Setup

## Overview
This document describes the setup and usage of the Bidang Geo Mapping feature in the Angular frontend application.

## Features
- **Map View**: Interactive Leaflet map displaying bidang data as polygons
- **List View**: Tabular view of bidang data with search and filtering
- **Pagination**: Efficient data loading with pagination support
- **Search & Filter**: Search by NOP, province, district, etc.
- **Real-time Data**: Live data from PostgreSQL backend via REST API

## Components

### 1. ThematicMapComponent (`/bidang/map`)
- Displays bidang data on an interactive Leaflet map
- Converts WKT geometry to GeoJSON for map rendering
- Shows popup information on polygon click
- Supports pagination for large datasets
- Responsive design for mobile and desktop

### 2. BidangListComponent (`/bidang/list`)
- Tabular view of bidang data
- Search functionality by NOP, province, district
- Filter by province dropdown
- Pagination controls
- Export capabilities (future enhancement)

## API Integration

### Service Methods (RestApiService)
- `checkBidangHealth()`: Health check endpoint
- `getAllBidang(query)`: Get all bidang with pagination
- `getBidangGeometry(query)`: Get bidang with geometry data
- `getBidangById(id)`: Get specific bidang by ID
- `getBidangByNop(nop)`: Get bidang by NOP
- `getBidangByProvince(kdProp)`: Get bidang by province code
- `convertWktToGeoJson(data)`: Convert WKT to GeoJSON format

### API Endpoints
- `GET /api/bidang/health` - Health check
- `GET /api/bidang` - List all bidang (paginated)
- `GET /api/bidang/geometry` - List bidang with geometry (paginated)
- `GET /api/bidang/{id}` - Get bidang by ID
- `GET /api/bidang/nop/{nop}` - Get bidang by NOP
- `GET /api/bidang/province/{kdProp}` - Get bidang by province

## Navigation

### Menu Structure
```
Bidang
├── Map View (/bidang/map)
└── List View (/bidang/list)
```

### Menu Configuration
- Added to `src/app/layouts/sidebar/menu.ts`
- Translation keys added to `src/assets/i18n/en.json`
- Uses Remix Icons for consistent styling

## Dependencies

### Required Packages
- `@asymmetrik/ngx-leaflet`: ^18.0.1 (Leaflet integration)
- `leaflet`: ^1.9.4 (Map library)
- `@types/leaflet`: ^1.9.12 (TypeScript definitions)

### Angular Modules
- `CommonModule`: Basic Angular directives
- `FormsModule`: Two-way data binding
- `LeafletModule`: Map functionality
- `RouterModule`: Navigation

## Configuration

### Environment
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/', // Backend API URL
  manifestApiKey: 'supersecretapikey'
};
```

### Map Configuration
- **Default Center**: Surabaya, Indonesia (-7.250445, 112.768845)
- **Default Zoom**: 10
- **Tile Layer**: OpenStreetMap
- **Map Height**: 500px (responsive)

## Usage

### 1. Accessing the Feature
1. Navigate to the sidebar menu
2. Click on "Bidang" menu item
3. Choose between "Map View" or "List View"

### 2. Map View Features
- **Zoom**: Use mouse wheel or zoom controls
- **Pan**: Click and drag to move around
- **Info**: Click on polygons to see detailed information
- **Pagination**: Use pagination controls to load more data

### 3. List View Features
- **Search**: Type in search box to filter results
- **Filter**: Use province dropdown to filter by province
- **Sort**: Click column headers to sort (future enhancement)
- **Pagination**: Navigate through pages of results

## Data Format

### Bidang Data Structure
```typescript
interface BidangData {
  id: string;
  nop: string;
  geom: string; // WKT format
  kd_prop: string; // Province code
  kd_dati2: string; // District code
  kd_kec: string; // Sub-district code
  kd_kel: string; // Village code
  kd_blok: string; // Block code
  no_urut: string; // Sequence number
  kd_jns_op: string; // Operation type
  created_at: string;
  updated_at: string;
  is_active: boolean;
}
```

### GeoJSON Conversion
The service automatically converts WKT geometry to GeoJSON format for Leaflet:
```typescript
{
  type: 'Feature',
  properties: { /* bidang properties */ },
  geometry: {
    type: 'Polygon',
    coordinates: [[[lng, lat], ...]]
  }
}
```

## Styling

### CSS Classes
- `.map-container`: Main map wrapper
- `.bidang-popup`: Popup content styling
- `.table-responsive`: Responsive table wrapper
- `.pagination`: Pagination controls

### Responsive Design
- Mobile-first approach
- Breakpoints at 768px
- Adaptive map height
- Collapsible search controls

## Troubleshooting

### Common Issues

1. **Map not loading**
   - Check if Leaflet CSS is imported
   - Verify API connection
   - Check browser console for errors

2. **No data displayed**
   - Verify backend API is running
   - Check API endpoint responses
   - Verify database connection

3. **Search not working**
   - Check if search term is valid
   - Verify API search parameters
   - Check network requests in browser dev tools

### Debug Mode
Enable debug logging by setting `console.log` statements in:
- `RestApiService` methods
- Component data loading methods
- Map initialization

## Future Enhancements

### Planned Features
- [ ] Export to Excel/CSV
- [ ] Advanced filtering options
- [ ] Map clustering for large datasets
- [ ] Print map functionality
- [ ] Offline data caching
- [ ] Real-time updates via WebSocket
- [ ] Custom map styles
- [ ] Measurement tools
- [ ] Drawing tools for annotations

### Performance Optimizations
- [ ] Virtual scrolling for large lists
- [ ] Map tile caching
- [ ] Lazy loading of geometry data
- [ ] Web Workers for data processing

## Support

For technical support or feature requests, please contact the development team or create an issue in the project repository.
