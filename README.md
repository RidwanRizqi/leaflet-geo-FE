# 🎯 Frontend Development Guidelines - Angular

Dokumentasi untuk pengembangan frontend menggunakan Angular dengan struktur yang konsisten dan maintainable.

## 🚀 Quick Start

### Development Server
```b### New Feature Checklist
- [ ] Feature module created
- [ ] Routing configured  
- [ ] Models defined
- [ ] Methods added to RestApiService
- [ ] List component with CRUD
- [ ] Form component with validation
- [ ] Error handling
- [ ] Testingerve  # Navigate to http://localhost:4200/
ng build  # Build untuk production
ng test   # Run unit tests
```

### Buat Feature Baru
```bash
# 1. Copy template
cp -r src/app/pages/template-feature src/app/pages/your-feature-name

# 2. Replace names (gunakan script atau manual)
# 3. Update routing di main module
```

## 📁 Struktur Project

### File Structure
```
pages/
├── feature-name/
│   ├── feature-name.module.ts           # Feature module
│   ├── feature-name-routing.module.ts   # Feature routing
│   ├── components/                      # Feature components
│   │   ├── entity-name/
│   │   │   ├── entity-list/            # List component
│   │   │   └── entity-form/            # Form component
│   └── models/                         # Type definitions
```

### Contoh Master Data (Struktur yang Benar)
```
master-data/
├── master-data.module.ts               # Module utama
├── master-data-routing.module.ts       # Routing semua master data
├── components/
│   ├── group/
│   │   ├── group-list/
│   │   └── group-form/
│   ├── department/
│   └── organization/
└── models/
```

## 🛠️ Template Features

### List Component (`template-list`)
- ✅ Search dengan debouncing
- ✅ Multiple filters
- ✅ Pagination
- ✅ Bulk operations (select all, delete)
- ✅ Export ke Excel/CSV
- ✅ Loading states
- ✅ Bootstrap responsive design

### Form Component (`template-form`)
- ✅ Reactive forms dengan validation
- ✅ Create/Edit modes
- ✅ Modal implementation
- ✅ Error handling

### Service Template
- ✅ CRUD operations
- ✅ Error handling
- ✅ Type safety

## 📝 Konvensi Penamaan

- **Files**: `kebab-case` (contoh: `user-profile.component.ts`)
- **Classes**: `PascalCase` (contoh: `UserProfileComponent`)
- **Variables**: `camelCase` (contoh: `isLoading`)
- **Constants**: `UPPER_SNAKE_CASE` (contoh: `API_BASE_URL`)

## 🎯 Best Practices

### 1. Component Structure
```typescript
export class FeatureComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    private restApiService: RestApiService // Direct injection
  ) {}
  
  ngOnInit(): void {
    this.loadData();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  private loadData(): void {
    // Direct call to RestApiService
    this.restApiService.getAllEntities(query)
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {});
  }
}
```

### 2. Form Validation
```typescript
initForm(): void {
  this.form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]]
  });
}

isFieldInvalid(field: string): boolean {
  const control = this.form.get(field);
  return !!(control && control.invalid && (control.dirty || control.touched));
}
```

### 3. Direct RestApiService Usage
```typescript
@Component({...})
export class EntityComponent {
  constructor(private restApiService: RestApiService) {}
  
  loadEntities(): void {
    // Follow existing patterns in RestApiService
    this.restApiService.getAllGroups(query).subscribe(data => {
      // Handle response
    });
  }
  
  createEntity(data: any): void {
    this.restApiService.createGroup(data).subscribe(result => {
      // Handle response
    });
  }
}

// No need for separate service layer
// All API calls centralized in RestApiService
```

## 🎨 UI Guidelines

### Bootstrap Usage (Minimal Custom CSS)
```html
<!-- Card Layout -->
<div class="card">
  <div class="card-header d-flex justify-content-between align-items-center">
    <h4 class="card-title mb-0">Title</h4>
    <button class="btn btn-primary">
      <i class="ri-add-line align-bottom me-1"></i>
      Add New
    </button>
  </div>
</div>

<!-- Responsive Table -->
<div class="table-responsive">
  <table class="table table-bordered table-striped align-middle">
    <!-- Table content -->
  </table>
</div>
```

## 🔧 RestApiService Integration

### Workflow untuk Fitur Baru
1. **Buat endpoint di BE** sesuai dengan pattern yang ada
2. **Tambah method di RestApiService** mengikuti pattern existing:
   ```typescript
   // Example dari existing code:
   getAllGroups(query: any = {}): Observable<any> {
     const params = new HttpParams({ fromObject: query });
     return this.http.get<{ data: { groups: any[] } }>(this.apiUrl + "group", { params })
       .pipe(map((response) => response.data.groups));
   }
   ```
3. **Buat feature service** yang memanggil RestApiService
4. **Test integration** antara FE dan BE

## 🔧 Quick Template Replacement
- **Naming**: `getAllEntities`, `getEntityById`, `createEntity`, `updateEntity`, `deleteEntity`
- **Response mapping**: Gunakan `.pipe(map(response => response.data))`
- **Query params**: Gunakan `HttpParams({ fromObject: query })`
- **Base URL**: Gunakan `this.apiUrl + "endpoint"`

### PowerShell Script
```powershell
$oldName = "template-feature"
$newName = "your-feature"
$targetPath = "src/app/pages/$newName"

Copy-Item -Path "src/app/pages/template-feature" -Destination $targetPath -Recurse

Get-ChildItem -Path $targetPath -Recurse -File | ForEach-Object {
    (Get-Content $_.FullName) | 
        ForEach-Object { $_ -replace $oldName, $newName } | 
        Set-Content $_.FullName
}
```

## ✅ Development Checklist

### New Feature
- [ ] Feature module created
- [ ] Routing configured  
- [ ] Models defined
- [ ] Service implemented
- [ ] List component with CRUD
- [ ] Form component with validation
- [ ] Error handling
- [ ] Testing

### Code Quality
- [ ] TypeScript strict mode
- [ ] Memory leak prevention
- [ ] Responsive design
- [ ] Bootstrap classes used
- [ ] Minimal custom CSS

## 🐛 Common Issues

### Import Errors
```typescript
// ❌ Wrong
import { Component } from '../../../core/models/component';

// ✅ Good  
import { Component } from '@core/models/component';
```

### Memory Leaks
```typescript
// ❌ Wrong
this.service.getData().subscribe();

// ✅ Good
this.service.getData()
  .pipe(takeUntil(this.destroy$))
  .subscribe();
```

---

**Happy Coding! 🚀** 

Gunakan template di `src/app/pages/template-feature/` untuk consistency dan follow best practices di atas.
