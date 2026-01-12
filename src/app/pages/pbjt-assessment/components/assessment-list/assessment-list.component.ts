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
          this.totalElements = data.length;
          this.totalPages = Math.ceil(data.length / this.pageSize);
          this.hasNext = (this.currentPage + 1) < this.totalPages;
          this.hasPrev = this.currentPage > 0;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading assessments:', error);
          this.error = 'Failed to load assessments with realization data';
          this.loading = false;
        }
      });
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadAssessments();
  }

  onNextPage(): void {
    if (this.hasNext) {
      this.currentPage++;
      this.loadAssessments();
    }
  }

  onPrevPage(): void {
    if (this.hasPrev) {
      this.currentPage--;
      this.loadAssessments();
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
