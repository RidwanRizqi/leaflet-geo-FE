import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AccommodationService } from '../../../services/accommodation.service';
import { AccommodationType, AccommodationTypeMetadata } from '../../../models/accommodation.model';

@Component({
  selector: 'app-hotel-property-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './property-list.component.html',
  styleUrls: ['./property-list.component.scss']
})
export class HotelPropertyListComponent implements OnInit {
  properties: any[] = [];
  filteredProperties: any[] = [];
  loading: boolean = true;
  error: string | null = null;

  // Filters
  selectedType: string = 'all';
  selectedStatus: string = 'all';
  searchTerm: string = '';

  // Statistics
  totalProperties: number = 0;
  formalCount: number = 0;
  informalCount: number = 0;
  totalRevenue: number = 0;
  totalTax: number = 0;

  // Enums
  AccommodationType = AccommodationType;
  accommodationTypes = [
    { value: 'all', label: 'Semua Tipe' },
    { value: AccommodationType.HOTEL, label: 'Hotel' },
    { value: AccommodationType.WISMA, label: 'Wisma/Guest House' },
    { value: AccommodationType.HOMESTAY, label: 'Homestay' },
    { value: AccommodationType.PENGINAPAN, label: 'Penginapan' },
    { value: AccommodationType.RUMAH_KOS, label: 'Rumah Kos' }
  ];
  accommodationMetadata = AccommodationTypeMetadata;

  statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'formal', label: 'Formal' },
    { value: 'partial', label: 'Partially Formal' },
    { value: 'informal', label: 'Informal' }
  ];

  constructor(
    private accommodationService: AccommodationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProperties();
  }

  loadProperties(): void {
    this.loading = true;
    this.accommodationService.getAccommodations({ pageSize: 9999 }).subscribe({
      next: (response: any) => {
        if (Array.isArray(response)) {
          this.properties = response;
        } else if (response?.items) {
          this.properties = response.items;
        } else {
          this.properties = [];
        }
        this.calculateStatistics();
        this.applyFilters();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading properties:', error);
        this.error = 'Failed to load properties';
        this.loading = false;
      }
    });
  }

  calculateStatistics(): void {
    this.totalProperties = this.properties.length;
    this.formalCount = this.properties.filter(p => p.hasBusinessPermit && p.hasTaxRegistration).length;
    this.informalCount = this.properties.filter(p => !p.hasBusinessPermit && !p.hasTaxRegistration).length;
    this.totalRevenue = this.properties.reduce((sum, p) => sum + (p.estimatedAnnualRevenue || 0), 0);
    this.totalTax = this.properties.reduce((sum, p) => sum + (p.projectedAnnualTax || 0), 0);
  }

  applyFilters(): void {
    let filtered = [...this.properties];

    if (this.selectedType !== 'all') {
      filtered = filtered.filter(p => p.accommodationType === this.selectedType);
    }

    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(p => {
        const status = this.getPropertyStatus(p);
        return status.value === this.selectedStatus;
      });
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        (p.propertyName?.toLowerCase().includes(term)) ||
        (p.ownerName?.toLowerCase().includes(term)) ||
        (p.address?.toLowerCase().includes(term))
      );
    }

    this.filteredProperties = filtered;
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.selectedType = 'all';
    this.selectedStatus = 'all';
    this.searchTerm = '';
    this.applyFilters();
  }

  viewProperty(property: any): void {
    if (property?.id) {
      this.router.navigate(['/pbjt-hotel/hotel-detail', property.id]);
    }
  }

  editProperty(property: any): void {
    if (property?.id) {
      this.router.navigate(['/pbjt-hotel/hotel-edit', property.id]);
    }
  }

  createNew(): void {
    this.router.navigate(['/pbjt-hotel/hotel-create']);
  }

  viewOnMap(): void {
    this.router.navigate(['/pbjt-hotel/hotel-map']);
  }

  getTypeLabel(type: AccommodationType): string {
    return this.accommodationMetadata[type]?.label || type;
  }

  getTypeColor(type: AccommodationType): string {
    return this.accommodationMetadata[type]?.color || '#666666';
  }

  getTypeRiIcon(type: AccommodationType): string {
    return this.accommodationMetadata[type]?.riIcon || 'ri-question-line';
  }

  formatCurrency(value: number | undefined | null): string {
    if (!value || value === 0) return 'Rp 0';
    try {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    } catch (e) {
      return `Rp ${value.toLocaleString()}`;
    }
  }

  getPropertyStatus(property: any): { value: string; label: string; badgeClass: string; icon: string } {
    if (!property) {
      return { value: 'unknown', label: 'Unknown', badgeClass: 'bg-secondary', icon: 'ri-question-line' };
    }
    if (property.hasBusinessPermit && property.hasTaxRegistration) {
      return { value: 'formal', label: 'Formal', badgeClass: 'bg-success', icon: 'ri-shield-check-line' };
    } else if (property.hasBusinessPermit || property.hasTaxRegistration) {
      return { value: 'partial', label: 'Partial', badgeClass: 'bg-warning', icon: 'ri-time-line' };
    } else {
      return { value: 'informal', label: 'Informal', badgeClass: 'bg-danger', icon: 'ri-error-warning-line' };
    }
  }

  refresh(): void {
    this.loadProperties();
  }
}
