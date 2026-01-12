import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Observable, Subject, BehaviorSubject, debounceTime, distinctUntilChanged, takeUntil, switchMap, finalize } from 'rxjs';

// Models dan Services
import {
  ITemplateEntity,
  ITemplateEntitySearchParams,
  TemplateEntityStatus
} from '../../../models/template-entity.model';
import { RestApiService } from '../../../../../core/services/rest-api.service';

// Shared Services
import { ModalService } from '../../../../../shared/services/modal.service';
import { UtilitiesService } from '../../../../../shared/services/utilities.service';

@Component({
  selector: 'app-template-list',
  templateUrl: './template-list.component.html',
  styleUrls: ['./template-list.component.scss']
})
export class TemplateListComponent implements OnInit, OnDestroy {
  // Breadcrumb
  breadCrumbItems = [
    { label: 'Pages', active: false },
    { label: 'Template Feature', active: false },
    { label: 'Template Entity', active: true }
  ];

  // Private destroy subject
  private destroy$ = new Subject<void>();

  // Data properties
  entities$: Observable<ITemplateEntity[]>;
  isLoading$ = new BehaviorSubject<boolean>(false);
  searchParams$ = new BehaviorSubject<ITemplateEntitySearchParams>({
    page: 1,
    pageSize: 10,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;

  // Search and Filter
  searchForm: FormGroup;
  statusOptions = Object.values(TemplateEntityStatus);

  // Selection
  selectedItems: ITemplateEntity[] = [];
  selectAll = false;

  // ViewChild references
  @ViewChild('deleteModal', { static: false }) deleteModal!: TemplateRef<any>;
  @ViewChild('bulkDeleteModal', { static: false }) bulkDeleteModal!: TemplateRef<any>;

  constructor(
    private fb: FormBuilder,
    private restApiService: RestApiService,
    private modalService: NgbModal,
    private translate: TranslateService,
    private utilities: UtilitiesService
  ) {
    this.initSearchForm();
    this.setupSearch();
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initSearchForm(): void {
    this.searchForm = this.fb.group({
      search: [''],
      status: [''],
      sortBy: ['createdAt'],
      sortOrder: ['desc']
    });
  }

  private setupSearch(): void {
    // Setup search debouncing
    this.searchForm.get('search')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(search => {
        this.updateSearchParams({ search, page: 1 });
      });

    // Setup other filter changes
    this.searchForm.get('status')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.updateSearchParams({ status: status || undefined, page: 1 });
      });

    this.searchForm.get('sortBy')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(sortBy => {
        this.updateSearchParams({ sortBy, page: 1 });
      });

    this.searchForm.get('sortOrder')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(sortOrder => {
        this.updateSearchParams({ sortOrder, page: 1 });
      });
  }

  private loadData(): void {
    this.entities$ = this.searchParams$.pipe(
      switchMap(params => {
        this.isLoading$.next(true);
        // TODO: Add getAllTemplateEntities method to RestApiService
        // Follow pattern: restApiService.getAllGroups(params)
        return this.restApiService.getAllTemplateEntities(params)
          .pipe(
            finalize(() => this.isLoading$.next(false))
          );
      })
    );
  }

  private updateSearchParams(updates: Partial<ITemplateEntitySearchParams>): void {
    const currentParams = this.searchParams$.value;
    this.searchParams$.next({ ...currentParams, ...updates });
  }

  // Pagination methods
  onPageChange(page: number): void {
    this.currentPage = page;
    this.updateSearchParams({ page });
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.updateSearchParams({ pageSize, page: 1 });
  }

  // Selection methods
  onSelectAll(event: any): void {
    this.selectAll = event.target.checked;
    if (this.selectAll) {
      this.entities$.pipe(takeUntil(this.destroy$)).subscribe(entities => {
        this.selectedItems = [...entities];
      });
    } else {
      this.selectedItems = [];
    }
  }

  onSelectItem(entity: ITemplateEntity, event: any): void {
    if (event.target.checked) {
      this.selectedItems.push(entity);
    } else {
      this.selectedItems = this.selectedItems.filter(item => item.id !== entity.id);
      this.selectAll = false;
    }
  }

  isSelected(entity: ITemplateEntity): boolean {
    return this.selectedItems.some(item => item.id === entity.id);
  }

  // CRUD operations
  onCreate(): void {
    // Navigate to create form or open modal
    console.log('Create new entity');
  }

  onEdit(entity: ITemplateEntity): void {
    // Navigate to edit form or open modal
    console.log('Edit entity:', entity);
  }

  onDelete(entity: ITemplateEntity): void {
    const modalRef = this.modalService.open(this.deleteModal, { centered: true });

    modalRef.result.then((result) => {
      if (result === 'delete') {
        this.deleteEntity(entity.id);
      }
    }).catch(() => {
      // Modal dismissed
    });
  }

  onBulkDelete(): void {
    if (this.selectedItems.length === 0) {
      return;
    }

    const modalRef = this.modalService.open(this.bulkDeleteModal, { centered: true });

    modalRef.result.then((result) => {
      if (result === 'delete') {
        this.bulkDeleteEntities();
      }
    }).catch(() => {
      // Modal dismissed
    });
  }

  private deleteEntity(id: number): void {
    // TODO: Add deleteTemplateEntity method to RestApiService
    // Follow pattern: restApiService.deleteGroup(id)
    this.restApiService.deleteTemplateEntity(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // TODO: Use proper toast service
          console.log('Entity deleted successfully');
          this.refreshData();
        },
        error: (error: any) => {
          console.error('Failed to delete entity:', error.message);
        }
      });
  }

  private bulkDeleteEntities(): void {
    const ids = this.selectedItems.map(item => item.id);

    // TODO: Add bulkDeleteTemplateEntities method to RestApiService
    // Note: Check if bulk operations are supported
    this.restApiService.bulkDeleteTemplateEntities(ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log(`${ids.length} entities deleted successfully`);
          this.selectedItems = [];
          this.selectAll = false;
          this.refreshData();
        },
        error: (error: any) => {
          console.error('Failed to delete entities:', error.message);
        }
      });
  }

  // Export functionality
  onExport(): void {
    const currentParams = this.searchParams$.value;

    // TODO: Add exportTemplateEntities method to RestApiService
    // Note: Check if export functionality exists
    this.restApiService.exportTemplateEntities(currentParams)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: any) => {
          // TODO: Implement download functionality
          console.log('Export completed');
        },
        error: (error: any) => {
          console.error('Failed to export data:', error.message);
        }
      });
  }

  // Utility methods
  refreshData(): void {
    const currentParams = this.searchParams$.value;
    this.searchParams$.next({ ...currentParams });
  }

  clearFilters(): void {
    this.searchForm.reset({
      search: '',
      status: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    this.updateSearchParams({
      search: '',
      status: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: 1
    });
  }

  getStatusBadgeClass(status: TemplateEntityStatus): string {
    switch (status) {
      case TemplateEntityStatus.ACTIVE:
        return 'badge bg-success';
      case TemplateEntityStatus.INACTIVE:
        return 'badge bg-danger';
      case TemplateEntityStatus.DRAFT:
        return 'badge bg-warning';
      default:
        return 'badge bg-secondary';
    }
  }
}
