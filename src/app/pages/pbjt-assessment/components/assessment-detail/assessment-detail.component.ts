import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PbjtAssessmentService } from '../../services/pbjt-assessment.service';
import { Assessment } from '../../models/assessment.model';

@Component({
  selector: 'app-assessment-detail',
  templateUrl: './assessment-detail.component.html',
  styleUrls: ['./assessment-detail.component.scss']
})
export class AssessmentDetailComponent implements OnInit {
  assessment: Assessment | null = null;
  loading: boolean = false;
  error: string = '';
  assessmentId: number = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private assessmentService: PbjtAssessmentService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.assessmentId = +params['id'];
      this.loadAssessment();
    });
  }

  loadAssessment(): void {
    this.loading = true;
    this.error = '';

    this.assessmentService.getAssessmentById(this.assessmentId).subscribe({
      next: (response) => {
        if (response.success) {
          this.assessment = response.data;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading assessment:', error);
        this.error = 'Failed to load assessment details';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/pbjt-assessment']);
  }

  editAssessment(): void {
    this.router.navigate(['/pbjt-assessment/edit', this.assessmentId]);
  }

  formatCurrency(value: number | undefined): string {
    return this.assessmentService.formatCurrency(value);
  }

  formatNumber(value: number | undefined): string {
    return this.assessmentService.formatNumber(value);
  }

  getConfidenceBadgeClass(level: string | undefined): string {
    return this.assessmentService.getConfidenceBadgeClass(level || '');
  }

  getBusinessTypeDisplay(type: string | undefined): string {
    return this.assessmentService.getBusinessTypeDisplayName(type || '');
  }

  getDayTypeDisplay(type: string): string {
    return this.assessmentService.getDayTypeDisplayName(type);
  }
}
