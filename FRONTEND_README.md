# 🎯 Frontend Development Guidelines & Templates

Dokumentasi lengkap untuk pengembangan frontend menggunakan Angular dengan struktur yang konsisten dan maintainable.

## 📚 Dokumentasi

### 🏗️ [Frontend Guidelines](./FRONTEND_GUIDELINES.md)
Panduan lengkap untuk pengembangan frontend termasuk:
- Struktur project dan konvensi penamaan
- Component dan service guidelines  
- Best practices dan performance tips
- UI/UX guidelines dengan Bootstrap

### 🛠️ [Template Generator Guide](./TEMPLATE_GENERATOR_GUIDE.md)
Panduan untuk menggunakan template generator:
- Cara copy dan customize template
- Script automation untuk replacement
- Checklist implementasi
- Common issues dan solutions

### 📁 [Master Data Example](./MASTER_DATA_EXAMPLE.md)
Contoh implementasi yang benar untuk Master Data module:
- Struktur folder yang proper
- Migration strategy dari struktur lama
- Implementation examples

## 🚀 Quick Start

### 1. Buat Feature Baru
```bash
# Copy template ke feature baru
cp -r src/app/pages/template-feature src/app/pages/your-feature-name

# Jalankan replacement script (lihat Template Generator Guide)
# Update routing di main module
```

### 2. Development Workflow
```bash
# 1. Analisis requirement
# 2. Design model dan interface
# 3. Buat service layer
# 4. Implement components
# 5. Add routing
# 6. Testing
# 7. Documentation
```

### 3. File Structure
```
pages/
├── feature-name/
│   ├── feature-name.module.ts           # Feature module
│   ├── feature-name-routing.module.ts   # Feature routing
│   ├── components/                      # Feature components
│   │   ├── entity-name/
│   │   │   ├── entity-list/            # List component
│   │   │   └── entity-form/            # Form component
│   ├── models/                         # Type definitions
│   └── services/                       # Business logic
```

## 📝 Templates Available

### 1. Complete Feature Template
Located at: `src/app/pages/template-feature/`

**Includes:**
- ✅ Feature module dan routing
- ✅ List component dengan search, filter, pagination
- ✅ Form component untuk create/edit
- ✅ Service dengan CRUD operations
- ✅ Model interfaces dan types
- ✅ Complete unit tests
- ✅ Bootstrap-based responsive UI

### 2. Component Templates
- **List Component**: Table dengan search, filter, bulk operations
- **Form Component**: Modal form dengan validation
- **Service Template**: HTTP client dengan error handling
- **Model Template**: TypeScript interfaces dan enums

## 🎯 Key Features

### ✨ Built-in Features
- 🔍 **Search & Filter**: Debounced search dengan multiple filters
- 📄 **Pagination**: Configurable page size dengan navigation
- ✅ **Bulk Operations**: Select all, bulk delete, bulk actions
- 📊 **Data Export**: Export ke Excel/CSV
- 🔄 **Loading States**: Visual feedback untuk semua operations
- ⚠️ **Error Handling**: Comprehensive error handling
- 🎨 **Responsive UI**: Bootstrap-based responsive design
- 🧪 **Testing Ready**: Complete unit test templates

### 🔧 Technical Features
- **TypeScript**: Full type safety
- **Reactive Forms**: Dengan validation
- **RxJS**: Reactive programming patterns
- **Lazy Loading**: Feature modules
- **OnPush Strategy**: Performance optimization
- **Memory Leak Prevention**: Proper subscription management

## 🛡️ Best Practices

### 1. **Code Organization**
```typescript
// ✅ Good: Organized imports
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Observable, Subject, takeUntil } from 'rxjs';

// Models
import { IEntity } from '../models/entity.model';
// Services  
import { EntityService } from '../services/entity.service';
```

### 2. **Memory Management**
```typescript
// ✅ Good: Proper subscription cleanup
export class Component implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  ngOnInit() {
    this.service.getData()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {});
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### 3. **Form Validation**
```typescript
// ✅ Good: Proper form validation
initForm() {
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

### 4. **Service Implementation**
```typescript
// ✅ Good: Proper service with error handling
@Injectable({ providedIn: 'root' })
export class EntityService {
  constructor(private http: HttpClient) {}
  
  getEntities(): Observable<Entity[]> {
    return this.http.get<ApiResponse<Entity[]>>(this.apiUrl)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }
  
  private handleError(error: any): Observable<never> {
    console.error('Service Error:', error);
    return throwError(() => new Error(error.message));
  }
}
```

## 🎨 UI Guidelines

### Bootstrap Usage
```html
<!-- ✅ Good: Consistent Bootstrap classes -->
<div class="card">
  <div class="card-header d-flex justify-content-between align-items-center">
    <h4 class="card-title mb-0">Title</h4>
    <button class="btn btn-primary">
      <i class="ri-add-line align-bottom me-1"></i>
      Add New
    </button>
  </div>
  <div class="card-body">
    <!-- Content -->
  </div>
</div>
```

### Responsive Tables
```html
<!-- ✅ Good: Responsive table -->
<div class="table-responsive">
  <table class="table table-bordered table-striped align-middle">
    <thead class="table-light">
      <tr>
        <th style="width: 50px;">
          <input type="checkbox" class="form-check-input">
        </th>
        <th>Name</th>
        <th style="width: 120px;">Actions</th>
      </tr>
    </thead>
  </table>
</div>
```

## 📋 Development Checklist

### New Feature Checklist
- [ ] ✅ Feature module created
- [ ] ✅ Routing configured
- [ ] ✅ Models defined
- [ ] ✅ Service implemented
- [ ] ✅ List component with CRUD
- [ ] ✅ Form component with validation
- [ ] ✅ Error handling implemented
- [ ] ✅ Loading states added
- [ ] ✅ Unit tests written
- [ ] ✅ Documentation updated

### Code Quality Checklist
- [ ] ✅ TypeScript strict mode
- [ ] ✅ No console.log in production
- [ ] ✅ Proper error handling
- [ ] ✅ Memory leak prevention
- [ ] ✅ Responsive design
- [ ] ✅ Accessibility compliance
- [ ] ✅ Performance optimized

## 🐛 Common Issues & Solutions

### 1. Import Errors
```typescript
// ❌ Wrong: Relative path hell
import { Component } from '../../../../../../../core/models/component';

// ✅ Good: Proper path structure
import { Component } from '@core/models/component';
```

### 2. Memory Leaks
```typescript
// ❌ Wrong: No unsubscribe
this.service.getData().subscribe(data => {});

// ✅ Good: Proper cleanup
this.service.getData()
  .pipe(takeUntil(this.destroy$))
  .subscribe(data => {});
```

### 3. Form Validation
```html
<!-- ❌ Wrong: No validation feedback -->
<input type="text" formControlName="name" class="form-control">

<!-- ✅ Good: Proper validation -->
<input 
  type="text" 
  formControlName="name" 
  class="form-control"
  [class.is-invalid]="isFieldInvalid('name')">
<div class="invalid-feedback" *ngIf="isFieldInvalid('name')">
  {{ getFieldError('name') }}
</div>
```

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Follow coding guidelines
4. Add tests
5. Update documentation
6. Submit pull request

## 📞 Support

Untuk pertanyaan atau issue:
- Buka GitHub issue
- Konsultasi dengan team lead
- Review dokumentasi ini

---

**Happy Coding! 🚀**

Ikuti guidelines ini untuk membuat frontend yang konsisten, maintainable, dan scalable!
