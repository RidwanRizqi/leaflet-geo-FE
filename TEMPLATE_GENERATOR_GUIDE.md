# Feature Template Generator Guide

## 📋 Template Usage

Template ini menyediakan struktur lengkap untuk membuat feature module baru di Angular dengan pola yang konsisten.

## 🚀 Cara Menggunakan Template

### 1. Copy Template Folder
```bash
# Copy template folder ke nama feature baru
cp -r src/app/pages/template-feature src/app/pages/your-feature-name
```

### 2. Rename Files dan Update Content

Ganti semua occurrence dari:
- `template-feature` → `your-feature-name`
- `TemplateFeature` → `YourFeatureName`
- `template-entity` → `your-entity-name`
- `TemplateEntity` → `YourEntityName`

### 3. File-by-File Replacement Guide

#### Module Files
- `template-feature.module.ts` → `your-feature.module.ts`
- `template-feature-routing.module.ts` → `your-feature-routing.module.ts`

#### Model Files
- `template-entity.model.ts` → `your-entity.model.ts`

#### Service Files
- `template-entity.service.ts` → `your-entity.service.ts`

#### Component Files
- `template-list/` → `your-entity-list/`
- `template-form/` → `your-entity-form/`

### 4. Update Imports dan References

#### Di Module File
```typescript
// Ganti ini:
import { TemplateFeatureRoutingModule } from './template-feature-routing.module';
import { TemplateListComponent } from './components/template-entity/template-list/template-list.component';

// Menjadi:
import { YourFeatureRoutingModule } from './your-feature-routing.module';
import { YourEntityListComponent } from './components/your-entity/your-entity-list/your-entity-list.component';
```

#### Di Service File
```typescript
// Ganti endpoint API:
private apiUrl = `${environment.apiUrl}/your-entities`;
```

#### Di Component Files
```typescript
// Update selector:
selector: 'app-your-entity-list',
```

### 5. Update Model Interface

Sesuaikan properties di model sesuai dengan entity Anda:

```typescript
export interface IYourEntity {
  id: number;
  // Add your specific properties here
  name: string;
  description: string;
  // ... other properties
  status: YourEntityStatus;
  createdAt: string;
  updatedAt: string;
}
```

### 6. Register Feature Module

Tambahkan routing di main routing module:

```typescript
// app-routing.module.ts atau pages-routing.module.ts
{
  path: 'your-feature',
  loadChildren: () => import('./pages/your-feature/your-feature.module').then(m => m.YourFeatureModule)
}
```

## 🔧 Customization Guidelines

### Form Validation
Sesuaikan validasi form di component:

```typescript
private initForm(): void {
  this.form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    // Add more fields as needed
  });
}
```

### Table Columns
Update tabel di HTML template untuk menampilkan kolom yang sesuai:

```html
<thead class="table-light">
  <tr>
    <th style="width: 50px;">
      <input type="checkbox" [checked]="selectAll" (change)="onSelectAll($event)">
    </th>
    <th>Name</th>
    <th>Email</th>
    <!-- Add more columns -->
    <th style="width: 120px;">Actions</th>
  </tr>
</thead>
```

### Search Parameters
Sesuaikan parameter pencarian:

```typescript
export interface IYourEntitySearchParams {
  page?: number;
  pageSize?: number;
  search?: string;
  // Add your specific search fields
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

## 📝 Quick Replacement Script

Untuk mempercepat proses replacement, Anda bisa menggunakan script berikut:

### PowerShell Script (Windows)
```powershell
# Set variables
$sourcePath = "src/app/pages/template-feature"
$targetPath = "src/app/pages/your-feature"
$oldFeatureName = "template-feature"
$newFeatureName = "your-feature"
$oldEntityName = "template-entity"
$newEntityName = "your-entity"
$oldClassName = "TemplateFeature"
$newClassName = "YourFeature"
$oldEntityClass = "TemplateEntity"
$newEntityClass = "YourEntity"

# Copy directory
Copy-Item -Path $sourcePath -Destination $targetPath -Recurse

# Rename files and update content
Get-ChildItem -Path $targetPath -Recurse -File | ForEach-Object {
    # Update file content
    (Get-Content $_.FullName) | 
        ForEach-Object { 
            $_ -replace $oldFeatureName, $newFeatureName -replace $oldEntityName, $newEntityName -replace $oldClassName, $newClassName -replace $oldEntityClass, $newEntityClass 
        } | 
        Set-Content $_.FullName
    
    # Rename file if needed
    if ($_.Name -match $oldFeatureName -or $_.Name -match $oldEntityName) {
        $newName = $_.Name -replace $oldFeatureName, $newFeatureName -replace $oldEntityName, $newEntityName
        Rename-Item $_.FullName $newName
    }
}

# Rename directories
Get-ChildItem -Path $targetPath -Recurse -Directory | Sort-Object FullName -Descending | ForEach-Object {
    if ($_.Name -match $oldEntityName) {
        $newName = $_.Name -replace $oldEntityName, $newEntityName
        Rename-Item $_.FullName $newName
    }
}
```

### Bash Script (Linux/Mac)
```bash
#!/bin/bash

# Set variables
SOURCE_PATH="src/app/pages/template-feature"
TARGET_PATH="src/app/pages/your-feature"
OLD_FEATURE="template-feature"
NEW_FEATURE="your-feature"
OLD_ENTITY="template-entity"
NEW_ENTITY="your-entity"
OLD_CLASS="TemplateFeature"
NEW_CLASS="YourFeature"
OLD_ENTITY_CLASS="TemplateEntity"
NEW_ENTITY_CLASS="YourEntity"

# Copy directory
cp -r "$SOURCE_PATH" "$TARGET_PATH"

# Update file contents
find "$TARGET_PATH" -type f -name "*.ts" -o -name "*.html" -o -name "*.scss" | xargs sed -i "s/$OLD_FEATURE/$NEW_FEATURE/g; s/$OLD_ENTITY/$NEW_ENTITY/g; s/$OLD_CLASS/$NEW_CLASS/g; s/$OLD_ENTITY_CLASS/$NEW_ENTITY_CLASS/g"

# Rename files
find "$TARGET_PATH" -name "*$OLD_FEATURE*" | while read file; do
    mv "$file" "${file/$OLD_FEATURE/$NEW_FEATURE}"
done

find "$TARGET_PATH" -name "*$OLD_ENTITY*" | while read file; do
    mv "$file" "${file/$OLD_ENTITY/$NEW_ENTITY}"
done
```

## ✅ Checklist Setelah Copy Template

- [ ] Folder structure sudah diganti namanya
- [ ] Semua file sudah diganti namanya
- [ ] Import statements sudah diupdate
- [ ] Model interface sudah disesuaikan
- [ ] API endpoint sudah diupdate
- [ ] Form validation sudah disesuaikan
- [ ] Table columns sudah disesuaikan
- [ ] Routing sudah ditambahkan ke main routing
- [ ] Module sudah di-register
- [ ] Testing berjalan tanpa error

## 🎯 Best Practices

1. **Konsistensi Naming**: Gunakan konvensi kebab-case untuk files dan PascalCase untuk classes
2. **Single Responsibility**: Setiap component hanya handle satu entity
3. **Reusable Components**: Buat shared components untuk fungsi yang sering digunakan
4. **Error Handling**: Implementasi error handling yang konsisten
5. **Loading States**: Berikan feedback visual saat loading
6. **Responsive Design**: Pastikan UI responsive dengan Bootstrap
7. **Accessibility**: Gunakan proper ARIA labels dan semantic HTML

## 🐛 Common Issues

### Import Errors
Pastikan semua import path sudah diupdate sesuai dengan nama file baru.

### Routing Issues
Periksa kembali routing configuration di module dan main routing.

### Service Injection
Pastikan service sudah di-provide di module atau root injector.

### Template References
Update semua template references ke component selector yang baru.

---

Dengan mengikuti guide ini, Anda dapat dengan cepat membuat feature module baru dengan struktur yang konsisten dan maintainable!
