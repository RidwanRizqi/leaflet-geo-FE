import { DecimalPipe } from '@angular/common';
import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { firstValueFrom, Observable, Subscription } from 'rxjs';
import { MasterSectionHierarchy } from 'src/app/core/models/master';
import { RestApiService } from 'src/app/core/services/rest-api.service';
import { ListjsService } from 'src/app/shared/services/listjs.service';
import { ModalService } from 'src/app/shared/services/modal.service';
import { UtilitiesService } from 'src/app/shared/services/utilities.service';

@Component({
  selector: 'app-section',
  templateUrl: './section.component.html',
  styleUrl: './section.component.scss',
})
export class SectionComponent implements OnInit {
  breadCrumbTitle!: string;
  breadCrumbItems!: Array<{}>;
  private langChangeSubscription!: Subscription;

  serviceSection: ListjsService;
  sectionItems: Observable<MasterSectionHierarchy[]>;
  sectionTotal: Observable<number>;

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

  originalData: MasterSectionHierarchy[] = [];
  filteredData: MasterSectionHierarchy[] = [];
  searchTerm: string = '';

  // For parent section selection
  parentSections: MasterSectionHierarchy[] = [];
  availableParents: MasterSectionHierarchy[] = [];

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
    this.serviceSection = new ListjsService(this.decpipe);
    this.sectionItems = this.serviceSection.datas$;
    this.sectionTotal = this.serviceSection.total$;
  }

  ngOnInit(): void {
    this.initializeBreadcrumb();
    this.initializeForm();
    this.loadSections();

    this.langChangeSubscription = this.translate.onLangChange.subscribe(() => {
      this.initializeBreadcrumb();
    });
  }

  ngOnDestroy(): void {
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
  }

  initializeBreadcrumb(): void {
    this.breadCrumbTitle = this.translate.instant('APPPAGE.MASTERDATA.SECTION.TITLE');
    this.breadCrumbItems = [
      {
        label: this.translate.instant('APPPAGE.MASTERDATA.SECTION.BREADCRUMB.LABEL1'),
        active: true,
      },
    ];
  }

  initializeForm(): void {
    this.fg = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      parent_id: [null], // Optional parent section
    });
  }

  get formControls() {
    return this.fg.controls;
  }

  async loadSections(): Promise<void> {
    try {
      this.spinner.show();
      const response = await firstValueFrom(this.restApiService.getAllSections());

      this.originalData = this.processHierarchicalData(response || []);
      this.parentSections = [...this.originalData];
      this.filteredData = [...this.originalData];
      this.totalRecords = this.filteredData.length;
      this.updatePagination();
      this.updateDisplayedData();

    } catch (error) {
      console.error('Error loading sections:', error);
      this.customModalService.open('error', this.translate.instant('COMMON.ERRORMSG.DEFAULT'));
    } finally {
      this.spinner.hide();
    }
  }

  processHierarchicalData(sections: MasterSectionHierarchy[]): MasterSectionHierarchy[] {
    // Add parent_name for display purposes
    return sections.map(section => {
      const parent = sections.find(s => s.id === section.parent_id);
      return {
        ...section,
        parent_name: parent?.name || null
      } as MasterSectionHierarchy;
    });
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

    this.serviceSection.setData(paginatedData);
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
    if (this.searchTerm.trim() === '') {
      this.filteredData = [...this.originalData];
    } else {
      this.filteredData = this.originalData.filter(item =>
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (item.parent_name && item.parent_name.toLowerCase().includes(this.searchTerm.toLowerCase()))
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
    this.updateAvailableParents();
    this.modalService.open(this.addEditModal!, { centered: true });
  }

  openEditModal(section: MasterSectionHierarchy): void {
    this.isEdit = true;
    this.editId = section.id;
    this.fg.patchValue({
      name: section.name,
      parent_id: section.parent_id,
    });
    this.submitted = false;
    this.updateAvailableParents(section.id);
    this.modalService.open(this.addEditModal!, { centered: true });
  }

  updateAvailableParents(excludeId?: number): void {
    // Exclude the current section and its descendants from parent options
    this.availableParents = this.parentSections.filter(section => {
      if (excludeId && section.id === excludeId) {
        return false;
      }
      // Additional logic can be added here to prevent circular references
      // For now, we'll just exclude the current section
      return true;
    });
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.fg.invalid) {
      return;
    }

    try {
      this.spinner.show();
      const formData = {
        name: this.fg.value.name,
        parent_id: this.fg.value.parent_id || null // Convert empty value to null
      };

      if (this.isEdit) {
        await firstValueFrom(this.restApiService.updateSection(this.editId, formData));
        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.UPDATE'));
      } else {
        await firstValueFrom(this.restApiService.createSection(formData));
        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.ADD'));
      }

      this.modalService.dismissAll();
      await this.loadSections();
    } catch (error) {
      console.error('Error saving section:', error);
      this.customModalService.open('error', this.translate.instant('COMMON.ERRORMSG.DEFAULT'));
    } finally {
      this.spinner.hide();
    }
  }

  async deleteSection(section: MasterSectionHierarchy): Promise<void> {
    // Check if section has children
    const hasChildren = this.originalData.some(s => s.parent_id === section.id);

    if (hasChildren) {
      this.customModalService.open('warning',
        this.translate.instant('APPPAGE.MASTERDATA.SECTION.MESSAGES.CANNOT_DELETE_HAS_CHILDREN')
      );
      return;
    }

    try {
      const result = await this.customModalService.open('confirm',
        this.translate.instant('COMMON.CUSTOMMODAL.DELETETEXT'),
        { name: section.name }
      );

      if (result === true) {
        try {
          this.spinner.show();
          await firstValueFrom(this.restApiService.deleteSection(section.id));
          this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.DELETE'));
          await this.loadSections();
        } catch (error) {
          console.error('Error deleting section:', error);
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

  trackByFn(index: number, item: MasterSectionHierarchy): number {
    return item.id;
  }

  getHierarchyDisplay(section: MasterSectionHierarchy): string {
    if (section.parent_name) {
      return `${section.parent_name} → ${section.name}`;
    }
    return section.name;
  }
}
