import { DecimalPipe } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { firstValueFrom, Observable, Subscription, Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { MasterEmailRecipient } from 'src/app/core/models/master';
import { RestApiService } from 'src/app/core/services/rest-api.service';
import { ListjsService } from 'src/app/shared/services/listjs.service';
import { ModalService } from 'src/app/shared/services/modal.service';
import { UtilitiesService } from 'src/app/shared/services/utilities.service';

@Component({
  selector: 'app-email-recipient',
  templateUrl: './email-recipient.component.html',
  styleUrl: './email-recipient.component.scss',
})
export class EmailRecipientComponent implements OnInit, OnDestroy {
  breadCrumbTitle!: string;
  breadCrumbItems!: Array<{}>;
  private langChangeSubscription!: Subscription;

  serviceEmailRecipient: ListjsService;
  emailRecipientItems: Observable<MasterEmailRecipient[]>;
  emailRecipientTotal: Observable<number>;

  page: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;
  startIndex: number = 0;
  endIndex: number = 10;
  totalRecords: number = 0;

  // Server-side pagination
  serverPagination: any = null;

  fg!: FormGroup;
  submitted = false;
  isEdit = false;
  editId: number = 0;

  @ViewChild('addEditModal', { static: false })
  addEditModal?: TemplateRef<any>;

  originalData: MasterEmailRecipient[] = [];
  filteredData: MasterEmailRecipient[] = [];
  searchTerm: string = '';

  // Search with debounce
  private searchSubject = new Subject<string>();
  isSearching: boolean = false;

  // Employee search
  employees: any[] = [];
  employeeSearchSubject = new Subject<string>();

  // Recipient type options
  recipientTypeOptions = [
    { value: 'to', label: 'To' },
    { value: 'cc', label: 'CC' },
    { value: 'bcc', label: 'BCC' }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private modalService: NgbModal,
    private restApiService: RestApiService,
    private translate: TranslateService,
    private spinner: NgxSpinnerService,
    private utilities: UtilitiesService,
    private customModalService: ModalService,
    private decpipe: DecimalPipe
  ) {
    this.serviceEmailRecipient = new ListjsService(this.decpipe);
    this.emailRecipientItems = this.serviceEmailRecipient.datas$;
    this.emailRecipientTotal = this.serviceEmailRecipient.total$;
  }

  ngOnInit(): void {
    this.initializeBreadcrumb();
    this.initializeForm();
    this.loadEmailRecipients();
    this.setupSearch();
    this.setupEmployeeSearch();
    this.updateRecipientTypeOptions();

    this.langChangeSubscription = this.translate.onLangChange.subscribe(() => {
      this.initializeBreadcrumb();
      this.updateRecipientTypeOptions();
    });
  }

  ngOnDestroy(): void {
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
    this.searchSubject.unsubscribe();
    this.employeeSearchSubject.unsubscribe();
  }

  setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      this.isSearching = true;
      this.performSearch(searchTerm);
      this.isSearching = false;
    });
  }

  setupEmployeeSearch(): void {
    this.employeeSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(searchTerm => {
        if (!searchTerm || searchTerm.length < 2) {
          this.employees = [];
          return of([]);
        }
        return this.restApiService.lookupEmployees({ search: searchTerm, limit: 50 });
      })
    ).subscribe({
      next: (employees) => {
        this.employees = (employees || []).map((emp: any) => ({
          ...emp,
          display_name: `${emp.employee_code} - ${emp.employee_name}`,
          position_desc: emp.position_desc || emp.position || 'N/A',
          department_desc: emp.department_desc || emp.department || 'N/A'
        }));
        console.log('Loaded employees for search:', this.employees.length, 'employees');
      },
      error: (error) => {
        console.error('Error searching employees:', error);
        this.employees = [];
      }
    });
  }

  searchEmployees(searchTerm: string): void {
    this.employeeSearchSubject.next(searchTerm);
  }

  onEmployeeSelected(selectedEmployeeCode: string): void {
    if (!selectedEmployeeCode) {
      return;
    }

    // Find the selected employee from the current employees array
    const selectedEmployee = this.employees.find(emp => emp.employee_code === selectedEmployeeCode);

    if (selectedEmployee) {
      console.log('Selected employee for email recipient:', selectedEmployee);

      // You can add additional logic here if needed, such as auto-populating other fields
      // For now, we just log the selection
    }
  }

  initializeBreadcrumb(): void {
    this.breadCrumbTitle = this.translate.instant('APPPAGE.MASTERDATA.EMAILRECIPIENT.TITLE');
    this.breadCrumbItems = [
      {
        label: this.translate.instant('APPPAGE.MASTERDATA.EMAILRECIPIENT.BREADCRUMB.LABEL1'),
        active: true,
      },
    ];
  }

  initializeForm(): void {
    this.fg = this.formBuilder.group({
      employee_code: ['', [Validators.required]],
      recipient_type: ['cc', [Validators.required]],
    });
  }

  updateRecipientTypeOptions(): void {
    this.recipientTypeOptions = [
      { value: 'to', label: this.translate.instant('APPPAGE.MASTERDATA.EMAILRECIPIENT.TYPES.TO') },
      { value: 'cc', label: this.translate.instant('APPPAGE.MASTERDATA.EMAILRECIPIENT.TYPES.CC') },
      { value: 'bcc', label: this.translate.instant('APPPAGE.MASTERDATA.EMAILRECIPIENT.TYPES.BCC') }
    ];
  }

  get formControls() {
    return this.fg.controls;
  }

  async loadEmailRecipients(searchTerm?: string): Promise<void> {
    try {
      this.spinner.show();

      // Prepare query parameters for server-side pagination and search
      const queryParams: any = {
        page: this.page,
        limit: this.pageSize
      };

      if (searchTerm && searchTerm.trim() !== '') {
        queryParams.search = searchTerm.trim();
      }

      const response = await firstValueFrom(this.restApiService.getAllEmailRecipients(queryParams));

      // Handle server response structure
      this.originalData = response.recipients || [];
      this.serverPagination = response.pagination || null;

      // Update pagination based on server response
      if (this.serverPagination) {
        this.totalRecords = this.serverPagination.total;
        this.totalPages = this.serverPagination.totalPages;
        this.page = this.serverPagination.page;
        this.startIndex = ((this.page - 1) * this.pageSize);
        this.endIndex = Math.min(this.startIndex + this.originalData.length, this.totalRecords);
      }

      // For server-side pagination, we don't need client-side filtering
      this.filteredData = [...this.originalData];
      this.updateDisplayedData();

    } catch (error) {
      console.error('Error loading email recipients:', error);
      this.customModalService.open('error', this.translate.instant('COMMON.ERRORMSG.DEFAULT'));
    } finally {
      this.spinner.hide();
    }
  }

  updatePagination(): void {
    this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
    this.startIndex = (this.page - 1) * this.pageSize;
    this.endIndex = Math.min(this.startIndex + this.pageSize, this.totalRecords);
  }

  updateDisplayedData(): void {
    const startIdx = (this.page - 1) * this.pageSize;
    const endIdx = startIdx + this.pageSize;
    const paginatedData = this.filteredData.slice(startIdx, endIdx);

    this.serviceEmailRecipient.setData(paginatedData);
  }

  onPageChange(newPage: number): void {
    this.page = newPage;
    this.loadEmailRecipients(this.searchTerm);
  }

  onPageSizeChange(newPageSize: number): void {
    this.pageSize = newPageSize;
    this.page = 1;
    this.loadEmailRecipients(this.searchTerm);
  }

  onSearch(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onSearchInput(event: any): void {
    const searchTerm = event.target.value;
    this.searchTerm = searchTerm;
    this.searchSubject.next(searchTerm);
  }

  performSearch(searchTerm: string): void {
    // Reset to page 1 when searching
    this.page = 1;
    // Load data with search term (server-side search)
    this.loadEmailRecipients(searchTerm);
  }

    // Helper method to get search hint text
  getSearchHint(): string {
    return this.translate.instant('APPPAGE.MASTERDATA.EMAILRECIPIENT.SEARCH.HINT') ||
           'Search by employee name, email, or department...';
  }

  openAddModal(): void {
    this.isEdit = false;
    this.editId = 0;
    this.fg.reset();
    this.fg.patchValue({ recipient_type: 'cc' }); // Set default value
    this.submitted = false;
    this.modalService.open(this.addEditModal!, { centered: true });
  }

  openEditModal(emailRecipient: MasterEmailRecipient): void {
    this.isEdit = true;
    this.editId = emailRecipient.id;
    this.fg.patchValue({
      employee_code: emailRecipient.employee_code,
      recipient_type: emailRecipient.recipient_type,
    });
    this.submitted = false;
    this.modalService.open(this.addEditModal!, { centered: true });
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.fg.invalid) {
      return;
    }

    try {
      this.spinner.show();
      const formData = this.fg.value;

      if (this.isEdit) {
        await firstValueFrom(this.restApiService.updateEmailRecipient(this.editId, formData));
        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.UPDATE'));
      } else {
        await firstValueFrom(this.restApiService.createEmailRecipient(formData));
        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.ADD'));
      }

      this.modalService.dismissAll();
      await this.loadEmailRecipients();
    } catch (error) {
      console.error('Error saving email recipient:', error);
      this.customModalService.open('error', this.translate.instant('COMMON.ERRORMSG.DEFAULT'));
    } finally {
      this.spinner.hide();
    }
  }

  async deleteEmailRecipient(emailRecipient: MasterEmailRecipient): Promise<void> {
    try {
      const result = await this.customModalService.open('confirm',
        this.translate.instant('COMMON.CUSTOMMODAL.DELETETEXT'),
        { name: emailRecipient.employee_code + ' (' + emailRecipient.recipient_type + ')' }
      );

      if (result === true) {
        try {
          this.spinner.show();
          await firstValueFrom(this.restApiService.deleteEmailRecipient(emailRecipient.id));
          this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.DELETE'));
          await this.loadEmailRecipients();
        } catch (error) {
          console.error('Error deleting email recipient:', error);
          this.customModalService.open('error', this.translate.instant('COMMON.ERRORMSG.DEFAULT'));
        } finally {
          this.spinner.hide();
        }
      }
    } catch (error) {
      console.log('Delete cancelled or error:', error);
    }
  }

  closeModal(): void {
    this.modalService.dismissAll();
  }

  trackByFn(index: number, item: MasterEmailRecipient): number {
    return item.id;
  }

  getRecipientTypeLabel(type: string): string {
    switch(type) {
      case 'to':
        return this.translate.instant('APPPAGE.MASTERDATA.EMAILRECIPIENT.TYPES.TO');
      case 'cc':
        return this.translate.instant('APPPAGE.MASTERDATA.EMAILRECIPIENT.TYPES.CC');
      case 'bcc':
        return this.translate.instant('APPPAGE.MASTERDATA.EMAILRECIPIENT.TYPES.BCC');
      default:
        return type.toUpperCase();
    }
  }
}
