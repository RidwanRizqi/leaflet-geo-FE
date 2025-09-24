import { DecimalPipe } from '@angular/common';
import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { firstValueFrom, Observable, Subscription } from 'rxjs';
import {
  MasterSubSectionNew as MasterSubSection,
  MasterManpower,
  CreateSubSectionRequest,
  MasterLine,
  MasterGroup
} from 'src/app/core/models/master';
import { RestApiService } from 'src/app/core/services/rest-api.service';
import { ListjsService } from 'src/app/shared/services/listjs.service';
import { ModalService } from 'src/app/shared/services/modal.service';
import { UtilitiesService } from 'src/app/shared/services/utilities.service';

@Component({
  selector: 'app-sub-section',
  templateUrl: './sub-section.component.html',
  styleUrl: './sub-section.component.scss',
})
export class SubSectionComponent implements OnInit {
  breadCrumbTitle!: string;
  breadCrumbItems!: Array<{}>;
  private langChangeSubscription!: Subscription;

  serviceSubSection: ListjsService;
  subSectionItems: Observable<MasterSubSection[]>;
  subSectionTotal: Observable<number>;

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

  originalData: MasterSubSection[] = [];
  filteredData: MasterSubSection[] = [];
  searchTerm: string = '';

  // Master data for dropdowns
  lines: MasterLine[] = [];
  groups: MasterGroup[] = [];

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
    this.serviceSubSection = new ListjsService(this.decpipe);
    this.subSectionItems = this.serviceSubSection.datas$;
    this.subSectionTotal = this.serviceSubSection.total$;
  }

  ngOnInit(): void {
    this.initializeBreadcrumb();
    this.initializeForm();
    this.loadMasterData();
    this.loadSubSections();

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
    this.breadCrumbTitle = this.translate.instant('APPPAGE.MASTERDATA.SUBSECTION.TITLE');
    this.breadCrumbItems = [
      {
        label: this.translate.instant('APPPAGE.MASTERDATA.SUBSECTION.BREADCRUMB.LABEL1'),
        active: true,
      },
    ];
  }

  initializeForm(): void {
    this.fg = this.formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      manpowers: this.formBuilder.array([])
    });
  }

  get formControls() {
    return this.fg.controls;
  }

  get manpowers(): FormArray {
    return this.fg.get('manpowers') as FormArray;
  }

  async loadMasterData(): Promise<void> {
    try {
      this.spinner.show();

      // Load all master data in parallel
      const [linesData, groupsData] = await Promise.all([
        firstValueFrom(this.restApiService.getAllLines()),
        firstValueFrom(this.restApiService.getAllGroups())
      ]);

      this.lines = linesData || [];
      this.groups = groupsData || [];

    } catch (error) {
      console.error('Error loading master data:', error);
      this.customModalService.open('error', this.translate.instant('COMMON.ERRORMSG.DEFAULT'));
    } finally {
      this.spinner.hide();
    }
  }

  async loadSubSections(): Promise<void> {
    try {
      this.spinner.show();
      const response = await firstValueFrom(this.restApiService.getAllSubSections());

      this.originalData = response || [];
      this.filteredData = [...this.originalData];
      this.totalRecords = this.filteredData.length;
      this.updatePagination();
      this.updateDisplayedData();

    } catch (error) {
      console.error('Error loading sub sections:', error);
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

    this.serviceSubSection.setData(paginatedData);
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
        item.name.toLowerCase().includes(this.searchTerm.toLowerCase())
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
    this.clearManpowers();
    // Don't add manpower by default - let user choose to add if needed
    this.submitted = false;
    this.modalService.open(this.addEditModal!, { centered: true, size: 'lg' });
  }

  openEditModal(subSection: MasterSubSection): void {
    this.isEdit = true;
    this.editId = subSection.id;

    this.fg.patchValue({
      name: subSection.name,
    });

    // Load existing manpowers
    this.clearManpowers();
    if (subSection.manpowers && subSection.manpowers.length > 0) {
      subSection.manpowers.forEach(manpower => {
        this.addManpower(manpower);
      });
    } else {
      this.addManpower(); // Add one empty manpower if none exist
    }

    this.submitted = false;
    this.modalService.open(this.addEditModal!, { centered: true, size: 'lg' });
  }

  createManpowerFormGroup(manpower?: MasterManpower): FormGroup {
    return this.formBuilder.group({
      line_id: [manpower?.line_id || null, [Validators.required]],
      group_id: [manpower?.group_id || null, [Validators.required]],
      manpower_count: [manpower?.manpower_count || null, [Validators.required, Validators.min(1)]]
    });
  }

  addManpower(manpower?: MasterManpower): void {
    this.manpowers.push(this.createManpowerFormGroup(manpower));
  }

  removeManpower(index: number): void {
    this.manpowers.removeAt(index);
  }

  clearManpowers(): void {
    while (this.manpowers.length !== 0) {
      this.manpowers.removeAt(0);
    }
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.fg.invalid) {
      this.markFormGroupTouched(this.fg);
      return;
    }

    try {
      this.spinner.show();

      const formData: CreateSubSectionRequest = {
        name: this.fg.value.name,
        manpowers: this.fg.value.manpowers.filter((mp: any) => mp.line_id && mp.group_id && mp.manpower_count)
      };

      if (this.isEdit) {
        await firstValueFrom(this.restApiService.updateSubSection(this.editId, formData));
        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.UPDATE'));
      } else {
        await firstValueFrom(this.restApiService.createSubSection(formData));
        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.ADD'));
      }

      this.modalService.dismissAll();
      await this.loadSubSections();
    } catch (error) {
      console.error('Error saving sub section:', error);
      this.customModalService.open('error', this.translate.instant('COMMON.ERRORMSG.DEFAULT'));
    } finally {
      this.spinner.hide();
    }
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  async deleteSubSection(subSection: MasterSubSection): Promise<void> {
    try {
      const result = await this.customModalService.open('confirm',
        this.translate.instant('COMMON.CUSTOMMODAL.DELETETEXT'),
        { name: subSection.name }
      );

      if (result === true) {
        try {
          this.spinner.show();
          await firstValueFrom(this.restApiService.deleteSubSection(subSection.id));
          this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.DELETE'));
          await this.loadSubSections();
        } catch (error) {
          console.error('Error deleting sub section:', error);
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

  trackByFn(index: number, item: MasterSubSection): number {
    return item.id;
  }

  trackByManpowerFn(index: number, item: any): number {
    return index;
  }

  getLineName(lineId: number): string {
    const line = this.lines.find(l => l.id === lineId);
    return line?.name || 'Unknown Line';
  }

  getGroupName(groupId: number): string {
    const group = this.groups.find(g => g.id === groupId);
    return group?.name || 'Unknown Group';
  }



  getTotalManpowerCount(subSection: MasterSubSection): number {
    if (!subSection.manpowers) return 0;
    return subSection.manpowers.reduce((total, mp) => total + mp.manpower_count, 0);
  }
}
