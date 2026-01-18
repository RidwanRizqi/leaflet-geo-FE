import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { PbjtAssessmentService } from '../../services/pbjt-assessment.service';

// Interface for realization data from SIMATDA
export interface AssessmentWithRealization {
  id: number;
  businessName: string;
  businessType: string;
  ownerName: string;
  taxObjectNumber: string;
  address: string;
  kelurahan: string;
  kecamatan: string;
  latitude: number;
  longitude: number;
  realisasi2021: number;
  realisasi2022: number;
  realisasi2023: number;
  realisasi2024: number;
  realisasi2025: number;
  totalRealisasi: number;
  annualPbjt: number;
  monthlyPbjt: number;
  confidenceLevel: string;
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

    this.assessmentService.getAssessmentsWithRealization()
      .subscribe({
        next: (data) => {
          this.assessments = data;
          this.applySearchAndPagination();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading assessments:', error);
          this.error = 'Failed to load assessments with realization data';
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
        a.ownerName?.toLowerCase().includes(searchLower) ||
        a.address?.toLowerCase().includes(searchLower) ||
        a.kecamatan?.toLowerCase().includes(searchLower) ||
        a.kelurahan?.toLowerCase().includes(searchLower)
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
        lat: assessment.latitude,
        lng: assessment.longitude,
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
