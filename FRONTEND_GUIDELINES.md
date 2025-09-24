# Frontend Development Guidelines - Angular

## 📋 Daftar Isi
1. [Struktur Project](#struktur-project)
2. [Konvensi Penamaan](#konvensi-penamaan)
3. [Struktur Feature Module](#struktur-feature-module)
4. [Component Guidelines](#component-guidelines)
5. [Service Guidelines](#service-guidelines)
6. [Routing Guidelines](#routing-guidelines)
7. [Template dan Generator](#template-dan-generator)

## 🏗️ Struktur Project

### Struktur Folder Utama
```
src/
├── app/
│   ├── core/                    # Core services, guards, interceptors
│   ├── shared/                  # Shared components, pipes, directives
│   ├── layouts/                 # Layout components
│   ├── pages/                   # Feature modules
│   │   ├── feature-name/        # Feature module folder
│   │   │   ├── feature-name.module.ts
│   │   │   ├── feature-name-routing.module.ts
│   │   │   ├── components/      # Feature components
│   │   │   ├── models/          # Feature-specific models
│   │   │   └── services/        # Feature-specific services
│   └── store/                   # State management
├── assets/                      # Static assets
└── environments/                # Environment configs
```

### Struktur Feature Module (Contoh: Master Data)
```
pages/
├── master-data/
│   ├── master-data.module.ts           # Feature module
│   ├── master-data-routing.module.ts   # Feature routing
│   ├── components/                     # Components dalam feature
│   │   ├── group/
│   │   │   ├── group-list/
│   │   │   │   ├── group-list.component.ts
│   │   │   │   ├── group-list.component.html
│   │   │   │   └── group-list.component.spec.ts
│   │   │   ├── group-form/
│   │   │   │   ├── group-form.component.ts
│   │   │   │   ├── group-form.component.html
│   │   │   │   └── group-form.component.spec.ts
│   │   │   └── group-detail/
│   │   ├── department/
│   │   └── division/
│   ├── models/
│   │   ├── group.model.ts
│   │   ├── department.model.ts
│   │   └── master-data.model.ts
│   └── services/
│       ├── group.service.ts
│       ├── department.service.ts
│       └── master-data.service.ts
```

## 📝 Konvensi Penamaan

### Files dan Folders
- **Folder**: `kebab-case` (contoh: `master-data`, `user-profile`)
- **Components**: `kebab-case.component.ts` (contoh: `group-list.component.ts`)
- **Services**: `kebab-case.service.ts` (contoh: `master-data.service.ts`)
- **Models**: `kebab-case.model.ts` (contoh: `user-profile.model.ts`)
- **Modules**: `kebab-case.module.ts` (contoh: `master-data.module.ts`)

### Classes dan Interfaces
- **Classes**: `PascalCase` (contoh: `GroupListComponent`, `MasterDataService`)
- **Interfaces**: `PascalCase` dengan prefix `I` (contoh: `IUser`, `IApiResponse`)
- **Enums**: `PascalCase` (contoh: `UserRole`, `ApiStatus`)

### Variables dan Methods
- **Variables**: `camelCase` (contoh: `userName`, `isLoading`)
- **Methods**: `camelCase` (contoh: `getUserData()`, `onSubmit()`)
- **Constants**: `UPPER_SNAKE_CASE` (contoh: `API_BASE_URL`, `MAX_FILE_SIZE`)

## 🧩 Struktur Feature Module

### 1. Feature Module Template
```typescript
// master-data.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Routing
import { MasterDataRoutingModule } from './master-data-routing.module';

// Shared Module
import { SharedModule } from '../shared/shared.module';

// Components
import { GroupListComponent } from './components/group/group-list/group-list.component';
import { GroupFormComponent } from './components/group/group-form/group-form.component';

@NgModule({
  declarations: [
    GroupListComponent,
    GroupFormComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MasterDataRoutingModule,
    SharedModule,
  ],
  providers: []
})
export class MasterDataModule { }
```

### 2. Feature Routing Template
```typescript
// master-data-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Components
import { GroupListComponent } from './components/group/group-list/group-list.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'group',
    pathMatch: 'full'
  },
  {
    path: 'group',
    component: GroupListComponent,
    data: { title: 'Group Management' }
  },
  // Add more routes as needed
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MasterDataRoutingModule { }
```

## 🎯 Component Guidelines

### 1. Component Structure
```typescript
import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Observable, Subject, takeUntil } from 'rxjs';

// Models dan Services
import { IUser } from '../../models/user.model';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-feature-component',
  templateUrl: './feature-component.component.html',
  styleUrls: ['./feature-component.component.scss'] // Jarang digunakan karena pakai Bootstrap
})
export class FeatureComponent implements OnInit, OnDestroy {
  // Private destroy subject untuk unsubscribe
  private destroy$ = new Subject<void>();
  
  // Properties
  isLoading = false;
  data$: Observable<IUser[]>;
  form: FormGroup;
  
  // ViewChild references
  @ViewChild('modal', { static: false }) modal: any;

  constructor(
    private fb: FormBuilder,
    private userService: UserService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]]
    });
  }

  private loadData(): void {
    this.isLoading = true;
    this.data$ = this.userService.getUsers()
      .pipe(takeUntil(this.destroy$));
  }

  onSubmit(): void {
    if (this.form.valid) {
      // Handle form submission
    }
  }
}
```

### 2. Component HTML Template
```html
<!-- feature-component.component.html -->
<div class="page-content">
  <!-- Breadcrumb -->
  <app-breadcrumb 
    [title]="'Feature Title'" 
    [breadcrumbItems]="breadcrumbItems">
  </app-breadcrumb>

  <!-- Main Content -->
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h4 class="card-title mb-0">Data List</h4>
            <button 
              type="button" 
              class="btn btn-primary"
              (click)="openModal()">
              <i class="ri-add-line align-bottom me-1"></i>
              Add New
            </button>
          </div>
          
          <div class="card-body">
            <!-- Search dan Filter -->
            <div class="row mb-3">
              <div class="col-md-6">
                <div class="search-box">
                  <input 
                    type="text" 
                    class="form-control search"
                    placeholder="Search..."
                    [(ngModel)]="searchTerm">
                  <i class="ri-search-line search-icon"></i>
                </div>
              </div>
            </div>

            <!-- Loading State -->
            <div *ngIf="isLoading" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>

            <!-- Data Table -->
            <div *ngIf="!isLoading" class="table-responsive">
              <table class="table table-bordered table-striped align-middle">
                <thead class="table-light">
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of data$ | async; let i = index">
                    <td>{{ i + 1 }}</td>
                    <td>{{ item.name }}</td>
                    <td>{{ item.email }}</td>
                    <td>
                      <div class="d-flex gap-2">
                        <button 
                          type="button" 
                          class="btn btn-sm btn-soft-primary"
                          (click)="edit(item)">
                          <i class="ri-pencil-fill"></i>
                        </button>
                        <button 
                          type="button" 
                          class="btn btn-sm btn-soft-danger"
                          (click)="delete(item.id)">
                          <i class="ri-delete-bin-fill"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Pagination -->
            <nav aria-label="Page navigation">
              <ngb-pagination 
                [(page)]="currentPage"
                [pageSize]="pageSize"
                [collectionSize]="totalItems"
                [maxSize]="5"
                [rotate]="true"
                class="justify-content-end">
              </ngb-pagination>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

## 🛠️ Service Guidelines

### Service Template
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Models
import { IUser, IApiResponse } from '../models/user.model';

// Environment
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) { }

  getUsers(params?: any): Observable<IUser[]> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    return this.http.get<IApiResponse<IUser[]>>(`${this.apiUrl}`, { params: httpParams })
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  getUserById(id: number): Observable<IUser> {
    return this.http.get<IApiResponse<IUser>>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  createUser(user: Partial<IUser>): Observable<IUser> {
    return this.http.post<IApiResponse<IUser>>(this.apiUrl, user)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  updateUser(id: number, user: Partial<IUser>): Observable<IUser> {
    return this.http.put<IApiResponse<IUser>>(`${this.apiUrl}/${id}`, user)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  deleteUser(id: number): Observable<boolean> {
    return this.http.delete<IApiResponse<boolean>>(`${this.apiUrl}/${id}`)
      .pipe(
        map(response => response.data),
        catchError(this.handleError)
      );
  }

  private handleError(error: any): Observable<never> {
    console.error('Service Error:', error);
    return throwError(() => error);
  }
}
```

## 📊 Model Guidelines

### Model Template
```typescript
// models/user.model.ts
export interface IUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateUserRequest {
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

export interface IUpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  MODERATOR = 'moderator'
}

// Generic API Response
export interface IApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: IPagination;
}

export interface IPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
```

## 🚀 Best Practices

### 1. CSS/SCSS Guidelines
- **Minimal Custom Styles**: Gunakan Bootstrap sebisa mungkin
- **Component-specific styles**: Hanya jika benar-benar diperlukan
- **Global styles**: Letakkan di `src/assets/scss/`

### 2. Performance
- **OnPush Change Detection**: Gunakan untuk komponen yang tidak sering berubah
- **TrackBy Functions**: Untuk *ngFor dengan data dinamis
- **Lazy Loading**: Untuk feature modules

### 3. Error Handling
- **Global Error Handler**: Implementasi di core module
- **User-friendly Messages**: Terjemahkan error ke bahasa user
- **Loading States**: Berikan feedback visual saat loading

### 4. Testing
- **Unit Tests**: Minimal untuk services dan utility functions
- **Component Tests**: Testing user interactions
- **E2E Tests**: Testing critical user flows

## 📁 File Structure Best Practices

```
feature-module/
├── feature.module.ts                    # Module utama
├── feature-routing.module.ts            # Routing module
├── components/                          # Semua components
│   ├── entity-name/                     # Group berdasarkan entity
│   │   ├── entity-list/                 # List/table component
│   │   ├── entity-form/                 # Form component (create/edit)
│   │   └── entity-detail/               # Detail view component
│   └── shared/                          # Shared components dalam feature
├── models/                              # Type definitions
│   ├── entity.model.ts
│   └── feature.model.ts
├── services/                            # Business logic
│   ├── entity.service.ts
│   └── feature.service.ts
└── guards/                              # Route guards (jika diperlukan)
    └── feature.guard.ts
```

## 🎨 UI/UX Guidelines

### Bootstrap Usage
- Gunakan Bootstrap classes untuk styling
- Custom CSS hanya untuk kasus khusus
- Konsisten dengan design system yang ada

### Component Library
- Gunakan ng-bootstrap untuk komponen Bootstrap
- Implementasi komponen reusable di shared module
- Dokumentasi komponen shared

Ikuti guidelines ini untuk menjaga konsistensi dan maintainability code frontend Angular!
