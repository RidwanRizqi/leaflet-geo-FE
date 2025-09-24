import { DecimalPipe } from '@angular/common';
import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { firstValueFrom, Observable, Subscription, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { MasterGroup } from 'src/app/core/models/master';
import { RestApiService } from 'src/app/core/services/rest-api.service';
import { ListjsService } from 'src/app/shared/services/listjs.service';
import { ModalService } from 'src/app/shared/services/modal.service';
import { UtilitiesService } from 'src/app/shared/services/utilities.service';

@Component({
  selector: 'app-group',
  templateUrl: './group.component.html',
  styleUrl: './group.component.scss',
})
export class GroupComponent implements OnInit, OnDestroy {
  breadCrumbTitle!: string;
  breadCrumbItems!: Array<{}>;
  private langChangeSubscription!: Subscription;

  serviceGroup: ListjsService;
  groupItems: Observable<MasterGroup[]>;
  groupTotal: Observable<number>;

  page: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;
  startIndex: number = 0;
  endIndex: number = 10;
  totalRecords: number = 0;

  fg!: FormGroup;
  submitted = false;
  isEdit = false;
  editId: number = 0;

  @ViewChild('addEditModal', { static: false })
  addEditModal?: TemplateRef<any>;

  originalData: MasterGroup[] = [];
  filteredData: MasterGroup[] = [];
  searchTerm: string = '';

  // Search with debounce
  private searchSubject = new Subject<string>();
  isSearching: boolean = false;

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
    this.serviceGroup = new ListjsService(this.decpipe);
    this.groupItems = this.serviceGroup.datas$;
    this.groupTotal = this.serviceGroup.total$;
  }

  ngOnInit(): void {
    this.initializeBreadcrumb();
    this.initializeForm();
    this.loadGroups();
    this.setupSearch();

    this.langChangeSubscription = this.translate.onLangChange.subscribe(() => {
      this.initializeBreadcrumb();
    });
  }

  ngOnDestroy(): void {
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
    this.searchSubject.unsubscribe();
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

  initializeBreadcrumb(): void {
    this.breadCrumbTitle = this.translate.instant('APPPAGE.MASTERDATA.GROUP.TITLE');
    this.breadCrumbItems = [
      {
        label: this.translate.instant('APPPAGE.MASTERDATA.GROUP.BREADCRUMB.LABEL1'),
        active: true,
      },
    ];
  }

  initializeForm(): void {
    this.fg = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
    });
  }

  get formControls() {
    return this.fg.controls;
  }

  async loadGroups(): Promise<void> {
    try {
      this.spinner.show();
      const response = await firstValueFrom(this.restApiService.getAllGroups());

      this.originalData = response || [];
      this.filteredData = [...this.originalData];
      this.totalRecords = this.filteredData.length;
      this.updatePagination();
      this.updateDisplayedData();

    } catch (error) {
      console.error('Error loading groups:', error);
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

    this.serviceGroup.setData(paginatedData);
  }

  onPageChange(newPage: number): void {
    this.page = newPage;
    this.updatePagination();
    this.updateDisplayedData();
  }

  onPageSizeChange(newPageSize: number): void {
    this.pageSize = newPageSize;
    this.page = 1;
    this.updatePagination();
    this.updateDisplayedData();
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
    if (searchTerm.trim() === '') {
      this.filteredData = [...this.originalData];
    } else {
      this.filteredData = this.originalData.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    this.totalRecords = this.filteredData.length;
    this.page = 1;
    this.updatePagination();
    this.updateDisplayedData();
  }

  openAddModal(): void {
    this.isEdit = false;
    this.editId = 0;
    this.fg.reset();
    this.submitted = false;
    this.modalService.open(this.addEditModal!, { centered: true });
  }

  openEditModal(group: MasterGroup): void {
    this.isEdit = true;
    this.editId = group.id;
    this.fg.patchValue({
      name: group.name,
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
        await firstValueFrom(this.restApiService.updateGroup(this.editId, formData));
        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.UPDATE'));
      } else {
        await firstValueFrom(this.restApiService.createGroup(formData));
        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.ADD'));
      }

      this.modalService.dismissAll();
      await this.loadGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      this.customModalService.open('error', this.translate.instant('COMMON.ERRORMSG.DEFAULT'));
    } finally {
      this.spinner.hide();
    }
  }

  async deleteGroup(group: MasterGroup): Promise<void> {
    try {
      const result = await this.customModalService.open('confirm',
        this.translate.instant('COMMON.CUSTOMMODAL.DELETETEXT'),
        { name: group.name }
      );

      if (result === true) {
        try {
          this.spinner.show();
          await firstValueFrom(this.restApiService.deleteGroup(group.id));
          this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.DELETE'));
          await this.loadGroups();
        } catch (error) {
          console.error('Error deleting group:', error);
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

  trackByFn(index: number, item: MasterGroup): number {
    return item.id;
  }
}
