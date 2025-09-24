import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { firstValueFrom, Subscription, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ModalService } from 'src/app/shared/services/modal.service';
import { RestApiService } from 'src/app/core/services/rest-api.service';

// Models
import { IEvent, ICreateEventRequest, IEventSearchParams } from './models/event.model';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit, OnDestroy {
  breadCrumbTitle!: string;
  breadCrumbItems!: Array<{}>;
  private langChangeSubscription!: Subscription;

  // Data properties
  events: IEvent[] = [];
  totalRecords: number = 0;

  // Pagination properties
  page: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;

  // Form properties
  fg!: FormGroup;
  submitted = false;
  isEdit = false;
  editId: number = 0;

  @ViewChild('addEditModal', { static: false })
  addEditModal?: TemplateRef<any>;

  @ViewChild('deleteModal', { static: false })
  deleteModal?: TemplateRef<any>;

  // Search properties
  searchTerm: string = '';
  statusFilter: 'active' | 'inactive' | 'completed' | '' = '';
  private searchSubject = new Subject<string>();
  isSearching: boolean = false;

  // Selected items for bulk actions
  selectedItems: Set<number> = new Set<number>();
  selectAll: boolean = false;

  constructor(
    private fb: FormBuilder,
    private modalService: NgbModal,
    private translate: TranslateService,
    private spinner: NgxSpinnerService,
    private restApi: RestApiService,
    private modal: ModalService
  ) {
  }

  ngOnInit(): void {
    this.initBreadcrumb();
    this.initForm();
    this.loadEvents();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
    this.searchSubject.complete();
  }

  private initBreadcrumb(): void {
    this.breadCrumbTitle = this.translate.instant('EVENTS.TITLE');
    this.breadCrumbItems = [
      { label: 'Dashboard', link: '/' },
      { label: this.translate.instant('EVENTS.BREADCRUMB.LABEL1'), active: true }
    ];

    // Subscribe to language changes
    this.langChangeSubscription = this.translate.onLangChange.subscribe(() => {
      this.breadCrumbTitle = this.translate.instant('EVENTS.TITLE');
      this.breadCrumbItems = [
        { label: 'Dashboard', link: '/' },
        { label: this.translate.instant('EVENTS.BREADCRUMB.LABEL1'), active: true }
      ];
    });
  }

  private initForm(): void {
    this.fg = this.fb.group({
      event_name: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      event_image: [''],
      event_date: ['', [Validators.required]],
      location: [''],
      status: ['active', [Validators.required]]
    });
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.page = 1;
      this.loadEvents();
    });
  }

  async loadEvents(): Promise<void> {
    try {
      this.spinner.show();

      const params: IEventSearchParams = {
        page: this.page,
        limit: this.pageSize,
        search: this.searchTerm || undefined,
        status: this.statusFilter || undefined
      };

      const response: any = await firstValueFrom(this.restApi.getEventsPaginated(params));

      this.events = response.data || [];
      this.totalRecords = response.meta?.pagination?.totalItems || 0;
      this.totalPages = response.meta?.pagination?.totalPages || 0;

      this.clearSelection();
    } catch (error) {
      console.error('Error loading events:', error);
      this.showNotification('error', 'ERROR_LOADING');
    } finally {
      this.spinner.hide();
    }
  }

  private showNotification(type: string, messageKey: string): void {
    const message = this.translate.instant(`EVENTS.MESSAGES.${messageKey.toUpperCase()}`);
    console.log(`${type}: ${message}`);
    // TODO: Implement actual notification service
  }

  onSearchInput(event: any): void {
    this.searchTerm = event.target.value;
    this.isSearching = true;
    this.searchSubject.next(this.searchTerm);
  }

  onSearch(): void {
    this.page = 1;
    this.loadEvents();
  }

  onStatusFilterChange(): void {
    this.page = 1;
    this.loadEvents();
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadEvents();
  }

  openAddModal(): void {
    this.isEdit = false;
    this.editId = 0;
    this.fg.reset();
    this.fg.patchValue({ status: 'active' });
    this.submitted = false;
    this.modalService.open(this.addEditModal, { size: 'lg' });
  }

  openEditModal(event: IEvent): void {
    this.isEdit = true;
    this.editId = event.id;
    this.fg.patchValue({
      event_name: event.event_name,
      description: event.description,
      event_image: event.event_image,
      event_date: this.formatDateForInput(event.event_date),
      location: event.location,
      status: event.status
    });
    this.submitted = false;
    this.modalService.open(this.addEditModal, { size: 'lg' });
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.fg.invalid) {
      return;
    }

    try {
      this.spinner.show();

      const formData: ICreateEventRequest = this.fg.value;

      if (this.isEdit) {
        await firstValueFrom(this.restApi.updateEvent(this.editId, formData));
        this.showNotification('success', 'UPDATED');
      } else {
        await firstValueFrom(this.restApi.createEvent(formData));
        this.showNotification('success', 'CREATED');
      }

      this.modalService.dismissAll();
      this.loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      this.showNotification('error', 'ERROR_SAVING');
    } finally {
      this.spinner.hide();
    }
  }

  confirmDelete(event: IEvent): void {
    this.editId = event.id;
    this.modalService.open(this.deleteModal);
  }

  async deleteEvent(): Promise<void> {
    try {
      this.spinner.show();
      await firstValueFrom(this.restApi.deleteEvent(this.editId));
      this.showNotification('success', 'DELETED');
      this.modalService.dismissAll();
      this.loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      this.showNotification('error', 'ERROR_DELETING');
    } finally {
      this.spinner.hide();
    }
  }

  async softDeleteEvent(event: IEvent): Promise<void> {
    try {
      this.spinner.show();
      await firstValueFrom(this.restApi.softDeleteEvent(event.id));
      this.showNotification('success', 'DEACTIVATED');
      this.loadEvents();
    } catch (error) {
      console.error('Error deactivating event:', error);
      this.showNotification('error', 'ERROR_DEACTIVATING');
    } finally {
      this.spinner.hide();
    }
  }

  // Selection methods
  toggleSelection(eventId: number): void {
    if (this.selectedItems.has(eventId)) {
      this.selectedItems.delete(eventId);
    } else {
      this.selectedItems.add(eventId);
    }
    this.updateSelectAllState();
  }

  toggleSelectAll(): void {
    if (this.selectAll) {
      this.selectedItems.clear();
    } else {
      this.events.forEach(event => this.selectedItems.add(event.id));
    }
    this.selectAll = !this.selectAll;
  }

  private updateSelectAllState(): void {
    this.selectAll = this.events.length > 0 && this.selectedItems.size === this.events.length;
  }

  private clearSelection(): void {
    this.selectedItems.clear();
    this.selectAll = false;
  }

  async deleteBulkEvents(): Promise<void> {
    if (this.selectedItems.size === 0) {
      this.showNotification('warning', 'SELECT_EVENTS');
      return;
    }

    const message = this.translate.instant('EVENTS.MESSAGES.CONFIRM_BULK_DELETE', { count: this.selectedItems.size });
    if (confirm(message)) {
      try {
        this.spinner.show();
        const ids = Array.from(this.selectedItems);
        await firstValueFrom(this.restApi.deleteBulkEvents(ids));
        this.showNotification('success', 'BULK_DELETED');
        this.loadEvents();
      } catch (error) {
        console.error('Error deleting events:', error);
        this.showNotification('error', 'ERROR_DELETING');
      } finally {
        this.spinner.hide();
      }
    }
  }

  // Utility methods
  private formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16); // Format for datetime-local input
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'badge bg-success';
      case 'inactive':
        return 'badge bg-secondary';
      case 'completed':
        return 'badge bg-primary';
      default:
        return 'badge bg-secondary';
    }
  }

  // Form validation helpers
  get f() { return this.fg.controls; }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.fg.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched || this.submitted));
  }

  // Track by function for ngFor
  trackByEventId(index: number, event: IEvent): number {
    return event.id;
  }

  // Math object for template
  Math = Math;
}
