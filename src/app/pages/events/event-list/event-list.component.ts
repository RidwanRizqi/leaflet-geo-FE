import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { firstValueFrom, Subscription, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ModalService } from 'src/app/shared/services/modal.service';
import { RestApiService } from 'src/app/core/services/rest-api.service';

// Models
import { IEvent, ICreateEventRequest, IEventSearchParams } from '../models/event.model';

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss']
})
export class EventListComponent implements OnInit, OnDestroy {
  breadCrumbTitle!: string;
  breadCrumbItems!: Array<{label: string, link?: string, active?: boolean}>;
  private langChangeSubscription!: Subscription;

  // Data properties
  events: IEvent[] = [];
  totalRecords: number = 0;
  loading: boolean = false;

  // Pagination properties
  page: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;

  // Form properties
  selectedEvent: IEvent | null = null;
  submitted = false;
  isEdit = false;
  editId: number = 0;

  @ViewChild('addEditModal', { static: false })
  addEditModal?: TemplateRef<any>;

  // Search properties
  searchTerm: string = '';
  searchSubject = new Subject<string>();
  isSearching: boolean = false;

  // Selected items for bulk actions
  selectedItems: Set<number> = new Set<number>();
  selectAll: boolean = false;

  constructor(
    private ngbModal: NgbModal,
    private translate: TranslateService,
    private spinner: NgxSpinnerService,
    private restApi: RestApiService,
    private modalService: ModalService
  ) {
  }

  ngOnInit(): void {
    this.initBreadcrumb();
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
    // Form is now handled by EventFormComponent
    // This method is no longer needed
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
        page: this.page || 1,
        limit: this.pageSize || 10,
        search: this.searchTerm || undefined
      };

      console.log('Calling getEventsPaginated with params:', params);
      const response: any = await firstValueFrom(this.restApi.getEventsPaginated(params));
      console.log('Response received:', response);

      this.events = response.data || [];
      this.totalRecords = response.meta?.pagination?.totalItems || 0;
      this.totalPages = response.meta?.pagination?.totalPages || 0;

      console.log('Parsed pagination:', {
        totalRecords: this.totalRecords,
        totalPages: this.totalPages,
        currentPage: this.page
      });

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

    // Map notification types to modal types
    let modalType: 'success' | 'error' | 'warning' = 'success';
    if (type === 'error') modalType = 'error';
    else if (type === 'warning') modalType = 'warning';
    else modalType = 'success';

    this.modalService.open(modalType, message);
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

  onPageChange(page: number): void {
    this.page = page;
    this.loadEvents();
  }

  openAddModal(): void {
    this.isEdit = false;
    this.selectedEvent = null;
    this.editId = 0;
    this.submitted = false;
    this.ngbModal.open(this.addEditModal, { size: 'lg' });
  }

  openEditModal(event: IEvent): void {
    this.isEdit = true;
    this.selectedEvent = { ...event };
    this.editId = event.id;
    this.submitted = false;
    this.ngbModal.open(this.addEditModal, { size: 'lg' });
  }

  onSaveEvent(eventData: ICreateEventRequest): void {
    this.saveEvent(eventData);
  }

  async saveEvent(formData: ICreateEventRequest): Promise<void> {
    try {
      this.spinner.show();

      if (this.isEdit) {
        await firstValueFrom(this.restApi.updateEvent(this.editId, formData));
        this.showNotification('success', 'UPDATED');
      } else {
        await firstValueFrom(this.restApi.createEvent(formData));
        this.showNotification('success', 'CREATED');
      }

      this.ngbModal.dismissAll();
      this.loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      this.showNotification('error', 'ERROR_SAVING');
    } finally {
      this.spinner.hide();
    }
  }

  async confirmDelete(event: IEvent): Promise<void> {
    try {
      const result = await this.modalService.open('delete', this.translate.instant('EVENTS.MESSAGES.CONFIRM_DELETE'));
      // If user confirms deletion
      this.editId = event.id;
      this.deleteEvent();
    } catch (error) {
      // User cancelled - do nothing
    }
  }

  async deleteEvent(): Promise<void> {
    try {
      this.spinner.show();
      await firstValueFrom(this.restApi.deleteEvent(this.editId));
      this.showNotification('success', 'DELETED');
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

  onImageError(event: any): void {
    if (event.target) {
      (event.target as HTMLImageElement).style.display = 'none';
    }
  }

  // Track by function for ngFor
  trackByEventId(index: number, event: IEvent): number {
    return event.id;
  }

  // Math object for template
  Math = Math;
}
