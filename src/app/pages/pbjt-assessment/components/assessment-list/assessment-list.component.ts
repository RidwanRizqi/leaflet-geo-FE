import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PbjtAssessmentService } from '../../services/pbjt-assessment.service';
import { Assessment } from '../../models/assessment.model';
import { forkJoin } from 'rxjs';

// Extended interface with realization data
export interface AssessmentWithRealization extends Assessment {
  realisasi2021: number;
  realisasi2022: number;
  realisasi2023: number;
  realisasi2024: number;
  realisasi2025: number;
  totalRealisasi: number;
}

@Component({
  selector: 'app-assessment-list',
  templateUrl: './assessment-list.component.html',
  styleUrls: ['./assessment-list.component.scss']
})
export class AssessmentListComponent implements OnInit {
  assessments: AssessmentWithRealization[] = [];
  filteredAssessments: AssessmentWithRealization[] = [];
  loading: boolean = false;
  error: string = '';
  Math = Math; // Expose Math to template

  // Pagination
  currentPage: number = 0;
  pageSize: number = 10;
  totalElements: number = 0;
  totalPages: number = 0;
  hasNext: boolean = false;
  hasPrev: boolean = false;

  // Search and filter
  searchTerm: string = '';
  selectedKabupaten: string = '';
  selectedConfidenceLevel: string = '';

  constructor(
    private assessmentService: PbjtAssessmentService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadAssessments();
  }

  loadAssessments(): void {
    this.loading = true;
    this.error = '';

    // Load both assessments and realization data in parallel
    forkJoin({
      assessments: this.assessmentService.getAllAssessments(0, 1000),
      realization: this.assessmentService.getAssessmentsWithRealization()
    }).subscribe({
      next: (result) => {
        if (result.assessments.success && result.assessments.data) {
          const assessmentsData = result.assessments.data;
          const realizationData = result.realization || [];

          // Create a map of realization data by business_id
          const realizationMap = new Map();
          realizationData.forEach((real: any) => {
            realizationMap.set(real.id, {
              realisasi2021: real.realisasi2021 || 0,
              realisasi2022: real.realisasi2022 || 0,
              realisasi2023: real.realisasi2023 || 0,
              realisasi2024: real.realisasi2024 || 0,
              realisasi2025: real.realisasi2025 || 0,
              totalRealisasi: real.totalRealisasi || 0
            });
          });

          // Merge assessment with realization data
          this.assessments = assessmentsData.map(assessment => ({
            ...assessment,
            realisasi2021: realizationMap.get(assessment.id)?.realisasi2021 || 0,
            realisasi2022: realizationMap.get(assessment.id)?.realisasi2022 || 0,
            realisasi2023: realizationMap.get(assessment.id)?.realisasi2023 || 0,
            realisasi2024: realizationMap.get(assessment.id)?.realisasi2024 || 0,
            realisasi2025: realizationMap.get(assessment.id)?.realisasi2025 || 0,
            totalRealisasi: realizationMap.get(assessment.id)?.totalRealisasi || 0
          }));

          this.applySearchAndPagination();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading assessments:', error);
        this.error = 'Failed to load assessments';
        this.loading = false;
      }
    });
  }

  /**
   * Apply search filter and pagination
   */
  applySearchAndPagination(): void {
    // Filter by search term
    let filtered = this.assessments;

    if (this.searchTerm.trim() !== '') {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = this.assessments.filter(a =>
        a.businessName?.toLowerCase().includes(searchLower) ||
        a.location?.address?.toLowerCase().includes(searchLower) ||
        a.location?.kecamatan?.toLowerCase().includes(searchLower) ||
        a.location?.kelurahan?.toLowerCase().includes(searchLower) ||
        a.businessId?.toLowerCase().includes(searchLower)
      );
    }

    // Update pagination info
    this.totalElements = filtered.length;
    this.totalPages = Math.ceil(filtered.length / this.pageSize);

    // Ensure current page is valid
    if (this.currentPage >= this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages - 1;
    }
    if (this.currentPage < 0) {
      this.currentPage = 0;
    }

    this.hasNext = (this.currentPage + 1) < this.totalPages;
    this.hasPrev = this.currentPage > 0;

    // Slice data for current page
    const startIndex = this.currentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.filteredAssessments = filtered.slice(startIndex, endIndex);
  }

  /**
   * Handle search input change
   */
  onSearch(): void {
    this.currentPage = 0; // Reset to first page when searching
    this.applySearchAndPagination();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applySearchAndPagination();
  }

  onNextPage(): void {
    if (this.hasNext) {
      this.currentPage++;
      this.applySearchAndPagination();
    }
  }

  onPrevPage(): void {
    if (this.hasPrev) {
      this.currentPage--;
      this.applySearchAndPagination();
    }
  }

  viewDetail(assessment: AssessmentWithRealization): void {
    this.router.navigate(['/pbjt-assessment/detail', assessment.id]);
  }

  createNew(): void {
    this.router.navigate(['/pbjt-assessment/create']);
  }

  editAssessment(assessment: AssessmentWithRealization): void {
    this.router.navigate(['/pbjt-assessment/edit', assessment.id]);
  }

  viewOnMap(assessment: AssessmentWithRealization): void {
    // Navigate to map with query parameters for location
    this.router.navigate(['/pbjt-assessment/map'], {
      queryParams: {
        lat: assessment.location?.latitude,
        lng: assessment.location?.longitude,
        businessId: assessment.id,
        businessName: assessment.businessName
      }
    });
  }

  deleteAssessment(assessment: AssessmentWithRealization): void {
    if (confirm(`Are you sure you want to delete assessment for ${assessment.businessName}?`)) {
      this.assessmentService.deleteAssessment(assessment.id!).subscribe({
        next: () => {
          this.loadAssessments();
        },
        error: (error) => {
          console.error('Error deleting assessment:', error);
          alert('Failed to delete assessment');
        }
      });
    }
  }

  formatCurrency(value: number | undefined): string {
    return this.assessmentService.formatCurrency(value);
  }

  getConfidenceBadgeClass(level: string | undefined): string {
    return this.assessmentService.getConfidenceBadgeClass(level || '');
  }

  getBusinessTypeDisplay(type: string | undefined): string {
    return this.assessmentService.getBusinessTypeDisplayName(type || '');
  }
}
