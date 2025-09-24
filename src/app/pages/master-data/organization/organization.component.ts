import { Component, OnInit, OnDestroy, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { NgxSpinnerService } from 'ngx-spinner';
import { firstValueFrom, Observable, Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

import { RestApiService } from 'src/app/core/services/rest-api.service';
import { ModalService } from 'src/app/shared/services/modal.service';
import { UtilitiesService } from 'src/app/shared/services/utilities.service';

@Component({
  selector: 'app-organization',
  templateUrl: './organization.component.html',
  styleUrls: ['./organization.component.scss']
})
export class OrganizationComponent implements OnInit, OnDestroy {
  @ViewChild('addEditModal', { static: false }) addEditModal!: TemplateRef<any>;
  @ViewChild('historyModal', { static: false }) historyModal!: TemplateRef<any>;

  // Form and Modal
  fg!: FormGroup;
  isEdit = false;
  editId = 0;
  submitted = false;

  // History Modal
  selectedEmployee: any = null;
  employeeHistory: any[] = [];
  historyData: any = null;
  isLoadingHistory: boolean = false;
  historyModalRef: any;

  // Backend Pagination
  page = 1;
  limit = 10;
  totalRecords = 0;
  totalPages = 0;
  startIndex = 0;
  endIndex = 0;

  // Data
  organizations: any[] = [];

  // Loading states
  isSearching: boolean = false;

  // Search and Filter
  searchTerm: string = '';
  filters: any = {
    department_id: null,
    grade_id: null,
    line_id: null,
    section_id: null,
    group_id: null,
    sub_section_id: null,
    is_shift: null,
    is_intern: null,
    is_active: null
  };

  // Lookup Data
  employees: any[] = [];
  supervisors: any[] = [];
  divisions: any[] = [];
  departments: any[] = [];
  grades: any[] = [];
  lines: any[] = [];
  sections: any[] = [];
  groups: any[] = [];
  subSections: any[] = [];

  // Employee search
  employeeSearchSubject = new Subject<string>();

  // Supervisor search
  supervisorSearchSubject = new Subject<string>();

  // Organization search with debounce
  private organizationSearchSubject = new Subject<string>();

  // Breadcrumb
  breadCrumbTitle: string = 'Organization';
  breadCrumbItems = [
    { label: 'Master Data', link: '/master-data', active: false },
    { label: 'Organization', link: '', active: true }
  ];

  constructor(
    private formBuilder: FormBuilder,
    private modalService: NgbModal,
    private restApiService: RestApiService,
    private translate: TranslateService,
    private spinner: NgxSpinnerService,
    private customModalService: ModalService,
    private utilities: UtilitiesService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadLookupData();
    this.loadOrganizations();
    this.setupEmployeeSearch();
    this.setupSupervisorSearch();
    this.setupOrganizationSearch();
  }

  ngOnDestroy(): void {
    this.employeeSearchSubject.unsubscribe();
    this.supervisorSearchSubject.unsubscribe();
    this.organizationSearchSubject.unsubscribe();
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
          // Ensure we preserve the department and grade IDs for auto-population
          deparment_id: emp.deparment_id || emp.department?.id || null,
          grade_id: emp.grade_id || null
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
      // Note: API returns 'deparment_id' (missing 't') not 'department_id'
      const departmentId = selectedEmployee.deparment_id || selectedEmployee.department?.id || null;
      const gradeId = selectedEmployee.grade_id || null;

      console.log('Auto-populating fields for employee:', selectedEmployeeCode, {
        department_id: departmentId,
        grade_id: gradeId,
        selectedEmployee: selectedEmployee
      });

      // Auto-populate department_id and grade_id from the selected employee data
      this.fg.patchValue({
        department_id: departmentId,
        grade_id: gradeId
      });
    }
  }

  setupSupervisorSearch(): void {
    this.supervisorSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(searchTerm => {
        if (!searchTerm || searchTerm.length < 2) {
          this.supervisors = [];
          return of([]);
        }
        return this.restApiService.getAllOrganizations({ search: searchTerm, limit: 50 });
      })
    ).subscribe({
      next: (response) => {
        const organizations = response.organizations || [];
        this.supervisors = organizations.map((org: any) => ({
          employee_code: org.employee_code,
          employee_name: org.employee_name,
          display_name: `${org.employee_code} - ${org.employee_name}`,
          position_desc: org.employee_position || 'N/A',
          department_desc: org.department?.department_name || 'N/A'
        }));
      },
      error: (error) => {
        console.error('Error searching supervisors:', error);
        this.supervisors = [];
      }
    });
  }

  searchSupervisors(searchTerm: string): void {
    this.supervisorSearchSubject.next(searchTerm);
  }

  setupOrganizationSearch(): void {
    this.organizationSearchSubject.pipe(
      debounceTime(500), // 500ms delay for organization search
      distinctUntilChanged(),
      switchMap(searchTerm => {
        this.searchTerm = searchTerm;
        this.page = 1; // Reset to first page when searching
        this.isSearching = true;
        return this.loadOrganizationsObservable();
      })
    ).subscribe({
      next: (response) => {
        this.handleOrganizationResponse(response);
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Error in organization search:', error);
        this.customModalService.open('error', this.translate.instant('COMMON.ERRORMSG.DEFAULT'));
        this.resetOrganizationState();
        this.isSearching = false;
      }
    });
  }

  private loadOrganizationsObservable(): Observable<any> {
    const params = {
      page: this.page,
      limit: this.limit,
      search: this.searchTerm,
      ...this.filters,
      sortBy: 'created_at',
      sortOrder: 'DESC'
    };

    return this.restApiService.getAllOrganizations(params);
  }

  initializeForm(): void {
    this.fg = this.formBuilder.group({
      employee_code: ['', [Validators.required]],
      supervisor_code: [''],
      department_id: [null, [Validators.required]],
      grade_id: [null, [Validators.required]],
      line_id: [null],
      section_id: [null],
      group_id: [null],
      sub_section_id: [null],
      effective_date: [null],
      is_shift: [false],
      is_intern: [false],
      is_maintenance: [false]
    });

    // Subscribe to employee_code changes for auto-population
    this.fg.get('employee_code')?.valueChanges.subscribe(employeeCode => {
      if (employeeCode) {
        this.onEmployeeSelected(employeeCode);
      }
    });
  }

  get formControls() {
    return this.fg.controls;
  }

        async loadLookupData(): Promise<void> {
    try {
      this.spinner.show();

      // Load lookup data in parallel (excluding employees - will be loaded on demand)
      const [
        divisionsData,
        departmentsData,
        gradesData,
        linesData,
        sectionsData,
        groupsData,
        subSectionsData
      ] = await Promise.all([
        firstValueFrom(this.restApiService.lookupDivisions()),
        firstValueFrom(this.restApiService.lookupDepartments()),
        firstValueFrom(this.restApiService.lookupGrades()),
        firstValueFrom(this.restApiService.getAllLines()),
        firstValueFrom(this.restApiService.getAllSections()),
        firstValueFrom(this.restApiService.getAllGroups()),
        firstValueFrom(this.restApiService.getAllSubSections())
      ]);

      this.divisions = divisionsData || [];
      this.departments = departmentsData || [];
      this.grades = gradesData || [];
      this.lines = linesData || [];
      this.sections = sectionsData || [];
      this.groups = groupsData || [];
      this.subSections = subSectionsData || [];

    } catch (error) {
      console.error('Error loading lookup data:', error);
      this.customModalService.open('error', this.translate.instant('COMMON.ERRORMSG.DEFAULT'));
    } finally {
      this.spinner.hide();
    }
  }



  async loadOrganizations(): Promise<void> {
    try {
      this.spinner.show();

      const response = await firstValueFrom(this.loadOrganizationsObservable());
      this.handleOrganizationResponse(response);

    } catch (error) {
      console.error('Error loading organizations:', error);
      this.customModalService.open('error', this.translate.instant('COMMON.ERRORMSG.DEFAULT'));
      this.resetOrganizationState();
    } finally {
      this.spinner.hide();
    }
  }

    private handleOrganizationResponse(response: any): void {
    console.log('Organization Response:', response); // Debug log

    // Process organizations and clean profile_pic URLs
    this.organizations = (response.organizations || []).map((item: any) => ({
      ...item,
      profile_pic: this.sanitizeImageUrl(item.profile_pic),
      imageError: false // Initialize image error flag
    }));

    // Handle pagination from server response
    if (response.pagination) {
      this.page = response.pagination.currentPage;
      this.totalPages = response.pagination.totalPages;
      this.totalRecords = response.pagination.totalItems;
      this.limit = response.pagination.itemsPerPage;
    } else {
      this.totalRecords = this.organizations.length;
      this.totalPages = Math.ceil(this.totalRecords / this.limit);
    }

    this.updatePaginationInfo();
  }

  private resetOrganizationState(): void {
    this.organizations = [];
    this.totalRecords = 0;
    this.totalPages = 0;
    this.page = 1;
    this.updatePaginationInfo();
  }

  updatePaginationInfo(): void {
    this.startIndex = (this.page - 1) * this.limit + 1;
    this.endIndex = Math.min(this.startIndex + this.limit - 1, this.totalRecords);
  }

  onSearch(): void {
    this.organizationSearchSubject.next(this.searchTerm);
  }

  onSearchInput(event: any): void {
    const searchTerm = event.target.value;
    this.searchTerm = searchTerm;

    // Trigger search immediately if search term is empty (to show all data)
    // Otherwise wait for debounce
    if (searchTerm.trim() === '') {
      this.organizationSearchSubject.next(searchTerm);
    } else if (searchTerm.length >= 2) {
      // Only search if user typed at least 2 characters
      this.organizationSearchSubject.next(searchTerm);
    }
  }

  onPageChange(page: number): void {
    this.page = page;
    this.loadOrganizations();
  }

  onLimitChange(): void {
    this.page = 1;
    this.loadOrganizations();
  }

  openAddModal(): void {
    this.isEdit = false;
    this.editId = 0;

    // Clear arrays for fresh search in add mode
    this.employees = [];
    this.supervisors = [];

    this.fg.reset();
    this.fg.patchValue({
      is_shift: false,
      is_intern: false,
      is_maintenance: false
    });
    this.submitted = false;
    this.modalService.open(this.addEditModal!, { centered: true, size: 'xl' });
  }

  async openEditModal(organization: any): Promise<void> {
    this.isEdit = true;
    this.editId = organization.id;

    try {
      this.spinner.show();

      // Pre-load employee and supervisor data for edit mode
      const loadPromises = [];

      // Load employee data
      if (organization.employee_code) {
        loadPromises.push(
          firstValueFrom(this.restApiService.lookupEmployees({ search: organization.employee_code }))
            .then(employees => {
              const selectedEmployee = employees?.find((emp: any) => emp.employee_code === organization.employee_code);
              if (selectedEmployee) {
                this.employees = [{
                  ...selectedEmployee,
                  display_name: `${selectedEmployee.employee_code} - ${selectedEmployee.employee_name}`,
                  deparment_id: selectedEmployee.deparment_id || selectedEmployee.department?.id || null,
                  grade_id: selectedEmployee.grade_id || null
                }];
              }
            })
        );
      }

      // Load supervisor data from organization endpoint
      if (organization.supervisor_code) {
        loadPromises.push(
          firstValueFrom(this.restApiService.getAllOrganizations({ search: organization.supervisor_code, limit: 10 }))
            .then(response => {
              const organizations = response.organizations || [];
              const selectedSupervisor = organizations.find((org: any) => org.employee_code === organization.supervisor_code);
              if (selectedSupervisor) {
                this.supervisors = [{
                  employee_code: selectedSupervisor.employee_code,
                  employee_name: selectedSupervisor.employee_name,
                  display_name: `${selectedSupervisor.employee_code} - ${selectedSupervisor.employee_name}`,
                  position_desc: selectedSupervisor.employee_position || 'N/A',
                  department_desc: selectedSupervisor.department?.department_name || 'N/A'
                }];
              }
            })
        );
      }

      // Execute all load promises
      if (loadPromises.length > 0) {
        await Promise.all(loadPromises);
      }

    } catch (error) {
      console.error('Error loading employee data for edit:', error);
      this.customModalService.open('error', 'Error loading employee data');
    } finally {
      this.spinner.hide();
    }

    this.fg.patchValue({
      employee_code: organization.employee_code,
      supervisor_code: organization.supervisor_code,
      department_id: organization.department_id,
      grade_id: organization.grade_id,
      line_id: organization.line_id,
      section_id: organization.section_id,
      group_id: organization.group_id,
      sub_section_id: organization.sub_section_id,
      effective_date: organization.effective_date ? new Date(organization.effective_date).toISOString().split('T')[0] : null,
      is_shift: organization.is_shift,
      is_intern: organization.is_intern,
      is_maintenance: organization.is_maintenance || false
    });

    this.submitted = false;
    this.modalService.open(this.addEditModal!, { centered: true, size: 'xl' });
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;

    if (this.fg.invalid) {
      this.markFormGroupTouched(this.fg);
      return;
    }

    try {
      this.spinner.show();

      const formData = this.fg.value;

      if (this.isEdit) {
        await firstValueFrom(this.restApiService.updateOrganization(this.editId, formData));
        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.UPDATE'));
      } else {
        await firstValueFrom(this.restApiService.createOrganization(formData));
        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.CREATE'));
      }

      this.closeModal();
      this.loadOrganizations();

    } catch (error: any) {
      console.error('Error saving organization:', error);
      this.customModalService.open('error',
        error?.error?.message || this.translate.instant('COMMON.ERRORMSG.DEFAULT')
      );
    } finally {
      this.spinner.hide();
    }
  }

    async deleteOrganization(organization: any): Promise<void> {
    const confirmed = await this.customModalService.open('confirm',
      this.translate.instant('COMMON.CONFIRMMSG.DELETE', { name: organization.employee_name || organization.employee_code })
    );

    if (confirmed) {
      try {
        this.spinner.show();
        await firstValueFrom(this.restApiService.deleteOrganization(organization.id));
        this.customModalService.open('success', this.translate.instant('COMMON.SUCCESSMSG.DELETE'));
        this.loadOrganizations();

      } catch (error: any) {
        console.error('Error deleting organization:', error);
        this.customModalService.open('error',
          error?.error?.message || this.translate.instant('COMMON.ERRORMSG.DEFAULT')
        );
      } finally {
        this.spinner.hide();
      }
    }
  }

  closeModal(): void {
    this.modalService.dismissAll();
    this.submitted = false;
    this.fg.reset();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.controls[key];
      control.markAsTouched();
    });
  }

  trackByFn(index: number, item: any): number {
    return item.id;
  }

  getInitials(name: string): string {
    if (!name) return '??';

    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      // If only one word, take first 2 characters
      return words[0].substring(0, 2).toUpperCase();
    } else {
      // Take first character of first and last word
      return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    }
  }

  onImageError(event: any, item: any): void {
    // Mark this item as having an image error
    item.imageError = true;

    // Optional: Log for debugging
    console.log('Image failed to load for employee:', item.employee_name, 'URL:', item.profile_pic);
  }

  sanitizeImageUrl(url: string): string {
    if (!url) return '';

    // Replace HTML entities
    return url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  }

    getAvatarClass(name: string): string {
    if (!name) return 'bg-soft-primary text-primary';

    // Generate consistent color based on name
    const colors = [
      'bg-soft-primary text-primary',
      'bg-soft-success text-success',
      'bg-soft-info text-info',
      'bg-soft-warning text-warning',
      'bg-soft-danger text-danger',
      'bg-soft-secondary text-secondary'
    ];

    // Use first character code to determine color
    const charCode = name.charCodeAt(0);
    const colorIndex = charCode % colors.length;

    return colors[colorIndex];
  }

    async openHistoryModal(employee: any): Promise<void> {
    this.selectedEmployee = employee;
    this.employeeHistory = [];
    this.historyData = null;
    this.isLoadingHistory = true;

    // Open modal first
    this.historyModalRef = this.modalService.open(this.historyModal, {
      centered: true,
      size: 'xl',
      backdrop: 'static'
    });

    try {
      const response = await firstValueFrom(
        this.restApiService.getOrganizationHistory(employee.employee_code)
      );

      console.log('History response:', response);

      // Store the full response data
      this.historyData = response;

      // Extract history array and sort by is_active (current first) then by created_at
      if (response.history && Array.isArray(response.history)) {
        this.employeeHistory = response.history.sort((a: any, b: any) => {
          // Current position first (is_active = 1)
          if (a.is_active !== b.is_active) {
            return b.is_active - a.is_active;
          }
          // Then sort by creation date (newest first)
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      } else {
        this.employeeHistory = [];
      }

    } catch (error) {
      console.error('Error loading employee history:', error);
      this.customModalService.open('error', 'Failed to load employee position history. Please try again.');
      this.employeeHistory = [];
      this.historyData = null;
    } finally {
      this.isLoadingHistory = false;
    }
  }

    closeHistoryModal(): void {
    if (this.historyModalRef) {
      this.historyModalRef.dismiss();
    }
    this.selectedEmployee = null;
    this.employeeHistory = [];
    this.historyData = null;
    this.isLoadingHistory = false;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  }

  getPositionTitle(record: any): string {
    // Try to get position from different sources
    if (this.historyData?.employee_position) {
      return this.historyData.employee_position;
    }

    // Fallback: construct position from organizational data
    const parts = [];
    if (record.subSection?.name) parts.push(record.subSection.name);
    if (record.section?.name) parts.push(record.section.name);
    if (record.line?.name) parts.push(record.line.name);

    return parts.length > 0 ? parts.join(' - ') : 'Position Title N/A';
  }

  calculateDuration(startDate: string, endDate?: string): string {
    if (!startDate) return 'N/A';

    try {
      const start = new Date(startDate);
      const end = endDate ? new Date(endDate) : new Date();

      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 30) {
        return `${diffDays} day(s)`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} month(s)`;
      } else {
        const years = Math.floor(diffDays / 365);
        const remainingMonths = Math.floor((diffDays % 365) / 30);
        if (remainingMonths > 0) {
          return `${years} year(s) ${remainingMonths} month(s)`;
        }
        return `${years} year(s)`;
      }
    } catch (error) {
      return 'N/A';
    }
  }
}
