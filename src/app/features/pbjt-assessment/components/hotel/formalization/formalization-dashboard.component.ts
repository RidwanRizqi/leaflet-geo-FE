import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AccommodationService } from '../../../services/accommodation.service';
import { AccommodationType, AccommodationTypeMetadata } from '../../../models/accommodation.model';

interface FormalizationTarget {
  id: string;
  propertyName: string;
  ownerName: string;
  ownerPhone: string;
  accommodationType: AccommodationType;
  totalRooms: number;
  estimatedRevenue: number;
  potentialTax: number;
  hasBusinessPermit: boolean;
  hasTaxRegistration: boolean;
  willingToFormalize: boolean | null;
  priority: 'high' | 'medium' | 'low';
  status: 'not_contacted' | 'contacted' | 'in_progress' | 'completed' | 'declined';
}

@Component({
  selector: 'app-hotel-formalization-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './formalization-dashboard.component.html',
  styleUrls: ['./formalization-dashboard.component.scss']
})
export class HotelFormalizationDashboardComponent implements OnInit {
  loading: boolean = true;
  properties: any[] = [];
  targets: FormalizationTarget[] = [];

  totalProperties = 0;
  formalCount = 0;
  informalCount = 0;
  partialCount = 0;
  willingCount = 0;
  notWillingCount = 0;
  unknownCount = 0;

  currentTaxRevenue = 0;
  potentialTaxRevenue = 0;
  taxGap = 0;

  notContactedCount = 0;
  contactedCount = 0;
  inProgressCount = 0;
  completedCount = 0;
  declinedCount = 0;

  AccommodationType = AccommodationType;
  accommodationMetadata = AccommodationTypeMetadata;

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
        this.properties = Array.isArray(response) ? response : (response?.items || []);
        this.analyzeFormalizationStatus();
        this.createTargetList();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading properties:', error);
        this.loading = false;
      }
    });
  }

  analyzeFormalizationStatus(): void {
    this.totalProperties = this.properties.length;
    this.formalCount = 0; this.partialCount = 0; this.informalCount = 0;
    this.willingCount = 0; this.notWillingCount = 0; this.unknownCount = 0;
    this.currentTaxRevenue = 0; this.potentialTaxRevenue = 0;

    this.properties.forEach(p => {
      const isFormal = p.hasBusinessPermit && p.hasTaxRegistration;
      const isPartial = (p.hasBusinessPermit || p.hasTaxRegistration) && !isFormal;

      if (isFormal) this.formalCount++;
      else if (isPartial) this.partialCount++;
      else this.informalCount++;

      if (p.willingToFormalize === true) this.willingCount++;
      else if (p.willingToFormalize === false) this.notWillingCount++;
      else this.unknownCount++;

      const tax = (p.estimatedAnnualRevenue || 0) * 0.10;
      if (isFormal) this.currentTaxRevenue += tax;
      else this.potentialTaxRevenue += tax;
    });

    this.taxGap = this.potentialTaxRevenue;
  }

  createTargetList(): void {
    this.notContactedCount = 0; this.contactedCount = 0; this.inProgressCount = 0;
    this.completedCount = 0; this.declinedCount = 0;

    this.targets = this.properties
      .filter(p => !p.hasBusinessPermit || !p.hasTaxRegistration)
      .map(p => ({
        id: p.id,
        propertyName: p.propertyName,
        ownerName: p.ownerName,
        ownerPhone: p.ownerPhone,
        accommodationType: p.accommodationType,
        totalRooms: p.totalRooms,
        estimatedRevenue: p.estimatedAnnualRevenue || 0,
        potentialTax: (p.estimatedAnnualRevenue || 0) * 0.10,
        hasBusinessPermit: p.hasBusinessPermit,
        hasTaxRegistration: p.hasTaxRegistration,
        willingToFormalize: p.willingToFormalize,
        priority: this.calculatePriority(p),
        status: this.determineStatus(p)
      }))
      .sort((a, b) => {
        const priorityOrder: any = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.potentialTax - a.potentialTax;
      });

    this.targets.forEach(t => {
      if (t.status === 'not_contacted') this.notContactedCount++;
      else if (t.status === 'contacted') this.contactedCount++;
      else if (t.status === 'in_progress') this.inProgressCount++;
      else if (t.status === 'completed') this.completedCount++;
      else if (t.status === 'declined') this.declinedCount++;
    });
  }

  calculatePriority(property: any): 'high' | 'medium' | 'low' {
    const revenue = property.estimatedAnnualRevenue || 0;
    const willing = property.willingToFormalize;
    const hasPartial = property.hasBusinessPermit || property.hasTaxRegistration;

    if (revenue > 200000000 && willing) return 'high';
    if ((revenue > 100000000 && willing) || revenue > 300000000) return 'medium';
    if (hasPartial) return 'medium';
    return 'low';
  }

  determineStatus(property: any): 'not_contacted' | 'contacted' | 'in_progress' | 'completed' | 'declined' {
    const hasPartial = property.hasBusinessPermit || property.hasTaxRegistration;
    const willing = property.willingToFormalize;
    if (willing === false) return 'declined';
    if (hasPartial) return 'in_progress';
    if (willing === true) return 'contacted';
    return 'not_contacted';
  }

  viewProperty(target: FormalizationTarget): void {
    this.router.navigate(['/pbjt-hotel/hotel-detail', target.id]);
  }

  contactOwner(target: FormalizationTarget): void {
    alert(`Contact ${target.ownerName} at ${target.ownerPhone}`);
  }

  formatCurrency(value: number): string {
    if (!value) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }

  getProgressPercentage(): number {
    if (this.targets.length === 0) return 0;
    return (this.completedCount / this.targets.length) * 100;
  }

  getStatusBadge(status: string): string {
    const badges: { [key: string]: string } = {
      not_contacted: 'bg-secondary',
      contacted: 'bg-info',
      in_progress: 'bg-warning',
      completed: 'bg-success',
      declined: 'bg-danger'
    };
    return badges[status] || 'bg-secondary';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      not_contacted: 'Not Contacted',
      contacted: 'Contacted',
      in_progress: 'In Progress',
      completed: 'Completed',
      declined: 'Declined'
    };
    return labels[status] || status;
  }

  getPriorityBadge(priority: string): string {
    const badges: { [key: string]: string } = {
      high: 'bg-danger',
      medium: 'bg-warning',
      low: 'bg-secondary'
    };
    return badges[priority] || 'bg-secondary';
  }

  getTypeLabel(type: AccommodationType): string {
    return this.accommodationMetadata[type]?.label || type;
  }

  exportTargets(): void {
    let csv = 'Property,Owner,Phone,Revenue,Potential Tax,Priority,Status\n';
    this.targets.forEach(t => {
      csv += `"${t.propertyName}","${t.ownerName}","${t.ownerPhone}",${t.estimatedRevenue},${t.potentialTax},"${t.priority}","${t.status}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formalization-targets.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
