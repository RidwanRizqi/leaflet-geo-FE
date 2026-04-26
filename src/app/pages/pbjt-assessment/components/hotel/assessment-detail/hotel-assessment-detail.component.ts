import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AccommodationService } from '../../../services/accommodation.service';
import { Accommodation, AccommodationType, AccommodationTypeMetadata } from '../../../models/accommodation.model';

@Component({
  selector: 'app-hotel-assessment-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hotel-assessment-detail.component.html',
  styleUrls: ['./hotel-assessment-detail.component.scss']
})
export class HotelAssessmentDetailComponent implements OnInit {
  assessment: Accommodation | null = null;
  loading = true;
  error: string | null = null;
  accommodationId: string | null = null;

  AccommodationType = AccommodationType;
  accommodationMetadata = AccommodationTypeMetadata;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private accommodationService: AccommodationService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.accommodationId = id;
        this.loadDetail(id);
      } else {
        this.error = 'No assessment ID provided';
        this.loading = false;
      }
    });
  }

  loadDetail(id: string): void {
    this.loading = true;
    this.error = null;

    this.accommodationService.getAccommodationById(id).subscribe({
      next: (data) => {
        this.assessment = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading detail:', err);
        this.error = 'Gagal memuat detail assessment.';
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/pbjt-hotel/assessment-list']);
  }

  editAssessment(): void {
    if (this.accommodationId) {
      this.router.navigate(['/pbjt-hotel/hotel-edit', this.accommodationId]);
    }
  }

  deleteAssessment(): void {
    if (!this.assessment || !this.accommodationId) return;
    const confirmed = confirm(`Hapus "${this.assessment.propertyName}"?`);
    if (confirmed) {
      this.accommodationService.deleteAccommodation(this.accommodationId).subscribe({
        next: () => {
          alert('Berhasil dihapus.');
          this.router.navigate(['/pbjt-hotel/assessment-list']);
        },
        error: () => alert('Gagal menghapus.')
      });
    }
  }

  openMap(): void {
    if (this.assessment?.latitude && this.assessment?.longitude) {
      window.open(`https://www.google.com/maps?q=${this.assessment.latitude},${this.assessment.longitude}`, '_blank');
    }
  }

  getTypeLabel(type: AccommodationType): string {
    return this.accommodationMetadata[type]?.label || type;
  }

  getTypeColor(type: AccommodationType): string {
    return this.accommodationMetadata[type]?.color || '#666';
  }

  getTypeRiIcon(type: AccommodationType): string {
    return this.accommodationMetadata[type]?.riIcon || 'ri-question-line';
  }

  getFormalizationBadge(): { label: string; class: string } {
    if (!this.assessment) return { label: 'Unknown', class: 'bg-secondary' };
    if (this.assessment.hasBusinessPermit && this.assessment.hasTaxRegistration) {
      return { label: 'Formal', class: 'bg-success' };
    } else if (this.assessment.hasBusinessPermit || this.assessment.hasTaxRegistration) {
      return { label: 'Semi Formal', class: 'bg-warning' };
    }
    return { label: 'Informal', class: 'bg-danger' };
  }

  formatCurrency(value: number | undefined | null): string {
    if (!value || value === 0) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(dateString: string | Date | null | undefined): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
