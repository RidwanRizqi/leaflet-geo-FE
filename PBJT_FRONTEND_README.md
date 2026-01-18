# PBJT Assessment Module - Frontend Documentation

## 📋 Overview
Frontend module untuk PBJT (Pajak Barang dan Jasa Tertentu) Assessment System yang terintegrasi dengan aplikasi leaflet-geo.

## 🎯 Features Implemented
- ✅ List view dengan pagination dan filter
- ✅ Create/Edit form dengan dynamic observations
- ✅ Detail view dengan calculation breakdown
- ✅ Responsive design dengan Bootstrap
- ✅ Real-time calculation dalam form
- ✅ Lazy loading module pattern

## 📁 File Structure
```
src/app/pages/pbjt-assessment/
├── components/
│   ├── assessment-list/
│   │   ├── assessment-list.component.ts
│   │   ├── assessment-list.component.html
│   │   └── assessment-list.component.scss
│   ├── assessment-form/
│   │   ├── assessment-form.component.ts
│   │   ├── assessment-form.component.html
│   │   └── assessment-form.component.scss
│   └── assessment-detail/
│       ├── assessment-detail.component.ts
│       ├── assessment-detail.component.html
│       └── assessment-detail.component.scss
├── models/
│   └── assessment.model.ts
├── services/
│   └── pbjt-assessment.service.ts
├── pbjt-assessment.module.ts
└── pbjt-assessment-routing.module.ts
```

## 🚀 Quick Start

### 1. Akses Module
Module dapat diakses melalui route:
```
http://localhost:4200/#/pbjt-assessment
```

### 2. Routes Available
- `/pbjt-assessment` - List semua assessment
- `/pbjt-assessment/create` - Form create baru
- `/pbjt-assessment/edit/:id` - Form edit existing
- `/pbjt-assessment/detail/:id` - Detail view dengan calculation

## 🔧 Components Detail

### AssessmentListComponent
**Purpose**: Display list assessment dengan pagination, search, filter

**Key Features**:
- Pagination dengan limit 10, 25, 50, 100
- Search by business name/ID
- Filter by kabupaten
- Delete confirmation dialog
- Action buttons (view, edit, delete)

**Usage**:
```html
<!-- Accessed via route -->
<app-assessment-list></app-assessment-list>
```

### AssessmentFormComponent
**Purpose**: Create/Edit form dengan reactive forms

**Key Features**:
- Reactive form dengan validation
- Dynamic observation rows (add/remove)
- Auto-calculate visitors per hour
- Edit mode dengan data loading
- Form validation dengan error messages

**Form Sections**:
1. **Business Profile**: Business ID, Name, Type, Capacity, Building Area, Operating Hours
2. **Location**: Address, Kelurahan, Kecamatan, Kabupaten, Coordinates
3. **Observations**: Dynamic array dengan tanggal, tipe hari, pengunjung, transaksi, durasi

**Validation Rules**:
- All fields marked with `*` are required
- Numeric fields must be > 0
- Coordinates must be valid lat/lng
- Operating hours must be valid time format

### AssessmentDetailComponent
**Purpose**: Display hasil assessment dengan breakdown

**Displayed Information**:
1. **Business Profile Card**: Business info, capacity, area, hours
2. **Location Card**: Full address dan coordinates
3. **Calculation Results**: Monthly/Annual PBJT, daily revenue (weekday/weekend)
4. **Adjustment Factors**: Business coefficient, location score, rates
5. **Confidence Score**: Score breakdown dengan recommendation
6. **Observations Table**: All observation data

**Features**:
- Formatted currency display (Rp)
- Badge untuk confidence level (HIGH/MEDIUM/LOW)
- Navigation ke list/edit
- Print-friendly layout

## 📡 Service Layer

### PbjtAssessmentService
**Base URL**: `${environment.apiUrl}/api/pbjt-assessments`

**Methods**:
```typescript
// CRUD Operations
getAllAssessments(page, limit, search?, kabupaten?): Observable<ApiResponse>
getAssessmentById(id): Observable<ApiResponse>
createAssessment(data): Observable<ApiResponse>
updateAssessment(id, data): Observable<ApiResponse>
deleteAssessment(id): Observable<ApiResponse>

// Utility Functions
formatCurrency(value): string               // Format: Rp 1.234.567
formatNumber(value): string                 // Format: 1.234
getConfidenceBadgeClass(level): string     // Returns: badge bg-success/warning/danger
getBusinessTypeDisplayName(type): string    // RESTAURANT → Restaurant
getDayTypeDisplayName(type): string        // WEEKDAY → Hari Kerja
```

## 🎨 Styling
Module menggunakan Bootstrap 5 classes yang sudah ada di leaflet-geo:
- Cards: `.card`, `.card-header`, `.card-body`
- Buttons: `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`
- Forms: `.form-control`, `.form-label`, `.form-select`
- Tables: `.table`, `.table-hover`, `.table-responsive`
- Badges: `.badge`, `.bg-success`, `.bg-warning`, `.bg-danger`
- Alerts: `.alert`, `.alert-info`, `.alert-danger`

## 🔌 Integration Points

### 1. API Integration
Service terhubung ke backend REST API:
- Base URL: `http://localhost:8080/api/pbjt-assessments`
- Response format:
```json
{
  "success": true,
  "message": "Success",
  "data": { ... },
  "pagination": {
    "currentPage": 1,
    "totalPages": 10,
    "totalRecords": 100,
    "limit": 10
  }
}
```

### 2. Router Integration
Module di-lazy load di [app-routing.module.ts](../../../app-routing.module.ts):
```typescript
{
  path: 'pbjt-assessment',
  loadChildren: () => import('./pages/pbjt-assessment/pbjt-assessment.module')
    .then(m => m.PbjtAssessmentModule)
}
```

### 3. Navigation Menu
Tambahkan link di sidebar menu (contoh):
```typescript
// In horizontal-topbar.component.ts or similar
{
  id: 12,
  label: 'PBJT Assessment',
  icon: 'ri-file-list-3-line',
  link: '/pbjt-assessment'
}
```

## 🧪 Testing Guide

### Manual Testing Checklist
- [ ] List page loads dengan pagination
- [ ] Search by business name works
- [ ] Filter by kabupaten works
- [ ] Create form validation works
- [ ] Can add/remove observation rows
- [ ] Visitors per hour auto-calculates
- [ ] Form submission success/error handling
- [ ] Edit loads existing data correctly
- [ ] Detail shows all calculation results
- [ ] Delete confirmation works
- [ ] Navigation between pages works
- [ ] Responsive pada mobile/tablet

### Sample Test Data
```typescript
{
  businessId: "TEST-001",
  businessName: "Test Restaurant",
  businessType: "RESTAURANT",
  seatingCapacity: 50,
  buildingArea: 100,
  operatingHoursStart: "08:00",
  operatingHoursEnd: "22:00",
  assessmentDate: "2024-01-15",
  location: {
    address: "Jl. Test No. 123",
    kelurahan: "Test Kelurahan",
    kecamatan: "Test Kecamatan",
    kabupaten: "BADUNG",
    latitude: -8.6705,
    longitude: 115.2126
  },
  observations: [
    {
      observationDate: "2024-01-15T10:00:00",
      dayType: "WEEKDAY",
      visitors: 80,
      avgTransaction: 150000,
      durationHours: 4
    }
  ]
}
```

## 🐛 Troubleshooting

### Common Issues

**1. Module not loading**
- Check: Pastikan route di app-routing.module.ts sudah benar
- Check: Module exports PbjtAssessmentModule dengan benar
- Solution: `ng serve --open` untuk reload

**2. API calls failing**
- Check: Backend running di `localhost:8080`
- Check: environment.ts memiliki `apiUrl` yang benar
- Check: CORS enabled di backend
- Solution: Cek browser console untuk error details

**3. Form validation not working**
- Check: ReactiveFormsModule imported di module
- Check: FormControl names match template
- Solution: Check console for validation errors

**4. Styling issues**
- Check: Bootstrap CSS loaded di index.html atau styles.scss
- Check: Custom SCSS tidak override Bootstrap classes
- Solution: Inspect element untuk class conflicts

## 📝 API Endpoints Reference

```
GET    /api/pbjt-assessments              - List all (with pagination)
GET    /api/pbjt-assessments/{id}         - Get by ID
POST   /api/pbjt-assessments              - Create new
PUT    /api/pbjt-assessments/{id}         - Update existing
DELETE /api/pbjt-assessments/{id}         - Delete by ID
GET    /api/pbjt-assessments/kabupaten/{kabupaten} - Filter by kabupaten
GET    /api/pbjt-assessments/business/{businessId} - Get by business ID
GET    /api/pbjt-assessments/health       - Health check
```

## 🚧 Future Enhancements
- [ ] Map integration untuk location picker
- [ ] Export PDF/Excel functionality
- [ ] Chart visualization untuk confidence breakdown
- [ ] Bulk upload dari CSV
- [ ] Historical comparison dashboard
- [ ] Email notification untuk assessment due dates
- [ ] Advanced filtering (by confidence level, date range)
- [ ] Mobile app version

## 📚 Related Documentation
- [Backend Setup](../../../PBJT_ASSESSMENT_SETUP.md)
- [Database Schema](../../../src/main/resources/sql/pbjt_assessment_setup.sql)
- [API Documentation](../../../src/main/java/com/example/leaflet_geo/controller/PbjtAssessmentController.java)

## 👥 Author
Developed as part of BPRD leaflet-geo integration project.

## 📄 License
Internal use only - BPRD Project
