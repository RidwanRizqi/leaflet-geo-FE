# Contoh Implementasi: Master Data Module

## 📁 Struktur Folder yang Benar

Berdasarkan guidance, berikut adalah struktur yang seharusnya untuk master-data:

```
pages/
├── master-data/
│   ├── master-data.module.ts           # Feature module utama
│   ├── master-data-routing.module.ts   # Routing untuk semua master data
│   ├── components/                     # Semua components master data
│   │   ├── group/
│   │   │   ├── group-list/
│   │   │   │   ├── group-list.component.ts
│   │   │   │   ├── group-list.component.html
│   │   │   │   └── group-list.component.spec.ts
│   │   │   └── group-form/
│   │   │       ├── group-form.component.ts
│   │   │       ├── group-form.component.html
│   │   │       └── group-form.component.spec.ts
│   │   ├── department/
│   │   ├── division/
│   │   ├── organization/
│   │   └── email-recipient/
│   ├── models/
│   │   ├── group.model.ts
│   │   ├── department.model.ts
│   │   ├── organization.model.ts
│   │   └── master-data.model.ts
│   └── services/
│       ├── group.service.ts
│       ├── department.service.ts
│       ├── organization.service.ts
│       └── master-data.service.ts
```

## 🔧 Implementasi yang Benar

### 1. Master Data Module
```typescript
// master-data.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Third Party Modules
import { NgbToastModule, NgbTooltipModule, NgbProgressbarModule, NgbDropdownModule, NgbNavModule, NgbPaginationModule, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule } from '@ngx-translate/core';

// Routing
import { MasterDataRoutingModule } from './master-data-routing.module';

// Shared Module
import { SharedModule } from '../../shared/shared.module';
import { FeatherIconsModule } from '../../shared-modules/feather-icons.module';

// Components
import { GroupListComponent } from './components/group/group-list/group-list.component';
import { GroupFormComponent } from './components/group/group-form/group-form.component';
import { DepartmentListComponent } from './components/department/department-list/department-list.component';
import { DepartmentFormComponent } from './components/department/department-form/department-form.component';
import { OrganizationListComponent } from './components/organization/organization-list/organization-list.component';
import { OrganizationFormComponent } from './components/organization/organization-form/organization-form.component';

@NgModule({
  declarations: [
    // Group Components
    GroupListComponent,
    GroupFormComponent,
    
    // Department Components
    DepartmentListComponent,
    DepartmentFormComponent,
    
    // Organization Components
    OrganizationListComponent,
    OrganizationFormComponent,
    
    // Add other master data components...
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MasterDataRoutingModule,
    SharedModule,
    FeatherIconsModule,
    TranslateModule,
    NgbToastModule,
    NgbTooltipModule,
    NgbProgressbarModule,
    NgbDropdownModule,
    NgbNavModule,
    NgbPaginationModule,
    NgbModalModule,
    NgSelectModule,
  ],
  providers: []
})
export class MasterDataModule { }
```

### 2. Master Data Routing
```typescript
// master-data-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { GroupListComponent } from './components/group/group-list/group-list.component';
import { DepartmentListComponent } from './components/department/department-list/department-list.component';
import { OrganizationListComponent } from './components/organization/organization-list/organization-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'group',
    pathMatch: 'full'
  },
  {
    path: 'group',
    component: GroupListComponent,
    data: { 
      title: 'Group Management',
      breadcrumb: 'Group'
    }
  },
  {
    path: 'department',
    component: DepartmentListComponent,
    data: { 
      title: 'Department Management',
      breadcrumb: 'Department'
    }
  },
  {
    path: 'organization',
    component: OrganizationListComponent,
    data: { 
      title: 'Organization Management',
      breadcrumb: 'Organization'
    }
  },
  // Add more routes for other master data entities
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MasterDataRoutingModule { }
```

### 3. Register di Main Pages Module
```typescript
// pages-routing.module.ts
const routes: Routes = [
  // ... existing routes
  {
    path: 'master-data',
    loadChildren: () => import('./master-data/master-data.module').then(m => m.MasterDataModule),
    data: { breadcrumb: 'Master Data' }
  },
  // ... other routes
];
```

## 🎯 Keuntungan Struktur Ini

### 1. **Modular dan Organized**
- Semua master data entities dalam satu module
- Components diorganisir berdasarkan entity
- Shared services dan models dalam satu tempat

### 2. **Lazy Loading Friendly**
- Module bisa di-lazy load
- Mengurangi initial bundle size
- Better performance

### 3. **Scalable**
- Mudah menambah entity baru
- Pattern yang konsisten
- Reusable components

### 4. **Maintainable**
- Code organization yang jelas
- Easy to find dan modify
- Consistent naming convention

## 🚀 Migration Strategy

Untuk memigrate dari struktur lama ke struktur baru:

### Step 1: Create New Structure
```bash
# Create new directory structure
mkdir -p src/app/pages/master-data/{components,models,services}
mkdir -p src/app/pages/master-data/components/{group,department,organization}/{list,form}
```

### Step 2: Move Components
```bash
# Move existing components to new structure
mv src/app/pages/master-data/group src/app/pages/master-data/components/group/group-list
mv src/app/pages/master-data/organization src/app/pages/master-data/components/organization/organization-list
# ... continue for other entities
```

### Step 3: Update Imports
Update semua import statements di:
- Module files
- Component files
- Routing files
- Test files

### Step 4: Create Shared Models dan Services
Extract common functionality ke shared models dan services.

### Step 5: Update Main Module
Update pages.module.ts untuk menggunakan struktur baru.

## 📋 Checklist Migration

- [ ] Create new folder structure
- [ ] Move existing components
- [ ] Update all import statements
- [ ] Create master-data.module.ts
- [ ] Create master-data-routing.module.ts
- [ ] Extract shared models
- [ ] Extract shared services
- [ ] Update main routing
- [ ] Update main module
- [ ] Test all routes working
- [ ] Test all components loading
- [ ] Update navigation menu
- [ ] Update breadcrumbs

## 🔄 Next Steps

1. **Implement Template Pattern**: Gunakan template yang sudah dibuat untuk consistency
2. **Add CRUD Operations**: Implement full CRUD untuk setiap entity
3. **Add Search dan Filter**: Implement search functionality
4. **Add Export Features**: Add export to Excel/CSV
5. **Add Bulk Operations**: Implement bulk delete, update, etc.
6. **Add Validation**: Comprehensive form validation
7. **Add Unit Tests**: Test coverage untuk semua components
8. **Add E2E Tests**: End-to-end testing

Dengan struktur ini, master data module akan lebih organized, maintainable, dan scalable!
