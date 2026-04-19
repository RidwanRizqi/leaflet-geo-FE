import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccommodationService } from '../../../services/accommodation.service';
import { AccommodationType, AccommodationTypeMetadata } from '../../../models/accommodation.model';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'financial' | 'compliance' | 'operational' | 'summary';
  fields: string[];
}

@Component({
  selector: 'app-hotel-report-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './report-generator.component.html',
  styleUrls: ['./report-generator.component.scss']
})
export class HotelReportGeneratorComponent implements OnInit {
  loading: boolean = false;
  generating: boolean = false;
  properties: any[] = [];

  templates: ReportTemplate[] = [
    { id: 'tax_summary', name: 'Tax Revenue Summary', description: 'Comprehensive tax revenue analysis by property type and formalization status', icon: 'ri-bank-line', category: 'financial', fields: [] },
    { id: 'property_inventory', name: 'Property Inventory', description: 'Complete list of all accommodation properties with detailed information', icon: 'ri-file-list-3-line', category: 'operational', fields: [] },
    { id: 'compliance_status', name: 'Compliance Status Report', description: 'Formalization status and compliance tracking for all properties', icon: 'ri-shield-check-line', category: 'compliance', fields: [] },
    { id: 'revenue_breakdown', name: 'Revenue Breakdown by Type', description: 'Revenue analysis segmented by accommodation type', icon: 'ri-pie-chart-line', category: 'financial', fields: [] },
    { id: 'formalization_targets', name: 'Formalization Targets', description: 'List of informal properties prioritized for formalization campaign', icon: 'ri-focus-3-line', category: 'compliance', fields: [] },
    { id: 'executive_summary', name: 'Executive Summary', description: 'High-level overview with key metrics and statistics', icon: 'ri-dashboard-line', category: 'summary', fields: [] }
  ];

  selectedTemplate: ReportTemplate | null = null;
  selectedType: string = 'all';
  selectedStatus: string = 'all';

  accommodationTypes = [
    { value: 'all', label: 'Semua Tipe' },
    ...Object.values(AccommodationType).map(type => ({
      value: type,
      label: AccommodationTypeMetadata[type]?.label || type
    }))
  ];

  statusOptions = [
    { value: 'all', label: 'Semua Status' },
    { value: 'formal', label: 'Formal' },
    { value: 'partial', label: 'Partially Formal' },
    { value: 'informal', label: 'Informal' }
  ];

  constructor(private accommodationService: AccommodationService) {}

  ngOnInit(): void {
    this.loadProperties();
  }

  loadProperties(): void {
    this.loading = true;
    this.accommodationService.getAccommodations({ pageSize: 9999 }).subscribe({
      next: (response: any) => {
        this.properties = Array.isArray(response) ? response : (response?.items || []);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading properties:', error);
        this.loading = false;
      }
    });
  }

  selectTemplate(template: ReportTemplate): void {
    this.selectedTemplate = template;
  }

  generateReport(): void {
    if (!this.selectedTemplate) return;
    this.generating = true;

    setTimeout(() => {
      const filteredData = this.getFilteredData();

      switch (this.selectedTemplate?.id) {
        case 'tax_summary': this.generateTaxSummary(filteredData); break;
        case 'property_inventory': this.generatePropertyInventory(filteredData); break;
        case 'compliance_status': this.generateComplianceStatus(filteredData); break;
        case 'revenue_breakdown': this.generateRevenueBreakdown(filteredData); break;
        case 'formalization_targets': this.generateFormalizationTargets(filteredData); break;
        case 'executive_summary': this.generateExecutiveSummary(filteredData); break;
      }

      this.generating = false;
    }, 1000);
  }

  getFilteredData(): any[] {
    let filtered = [...this.properties];
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(p => p.accommodationType === this.selectedType);
    }
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(p => {
        const isFormal = p.hasBusinessPermit && p.hasTaxRegistration;
        const isPartial = (p.hasBusinessPermit || p.hasTaxRegistration) && !isFormal;
        if (this.selectedStatus === 'formal') return isFormal;
        if (this.selectedStatus === 'partial') return isPartial;
        if (this.selectedStatus === 'informal') return !p.hasBusinessPermit && !p.hasTaxRegistration;
        return true;
      });
    }
    return filtered;
  }

  generateTaxSummary(data: any[]): void {
    let csv = 'Property Name,Type,Revenue,Tax,Business Permit,Tax Registration\n';
    data.forEach(p => {
      csv += `"${p.propertyName}","${this.getTypeLabel(p.accommodationType)}",${p.estimatedAnnualRevenue || 0},${p.projectedAnnualTax || 0},${p.hasBusinessPermit ? 'Yes' : 'No'},${p.hasTaxRegistration ? 'Yes' : 'No'}\n`;
    });
    this.downloadCSV(csv, 'tax-summary-report.csv');
  }

  generatePropertyInventory(data: any[]): void {
    let csv = 'Property Name,Owner,Type,Rooms,Address,Kelurahan,Kecamatan\n';
    data.forEach(p => {
      csv += `"${p.propertyName}","${p.ownerName}","${this.getTypeLabel(p.accommodationType)}",${p.totalRooms},"${p.address || ''}","${p.kelurahan || ''}","${p.kecamatan || ''}"\n`;
    });
    this.downloadCSV(csv, 'property-inventory-report.csv');
  }

  generateComplianceStatus(data: any[]): void {
    let csv = 'Property Name,Owner,Business Permit,Tax Registration,Willing to Formalize,Revenue\n';
    data.forEach(p => {
      csv += `"${p.propertyName}","${p.ownerName}",${p.hasBusinessPermit ? 'Yes' : 'No'},${p.hasTaxRegistration ? 'Yes' : 'No'},${p.willingToFormalize === true ? 'Yes' : p.willingToFormalize === false ? 'No' : 'Unknown'},${p.estimatedAnnualRevenue || 0}\n`;
    });
    this.downloadCSV(csv, 'compliance-status-report.csv');
  }

  generateRevenueBreakdown(data: any[]): void {
    const breakdown: { [key: string]: { count: number; revenue: number; tax: number } } = {};
    data.forEach(p => {
      const type = p.accommodationType;
      if (!breakdown[type]) breakdown[type] = { count: 0, revenue: 0, tax: 0 };
      breakdown[type].count++;
      breakdown[type].revenue += p.estimatedAnnualRevenue || 0;
      breakdown[type].tax += p.projectedAnnualTax || 0;
    });

    let csv = 'Type,Count,Total Revenue,Average Revenue,Total Tax\n';
    Object.keys(breakdown).forEach(type => {
      const b = breakdown[type];
      csv += `"${AccommodationTypeMetadata[type as AccommodationType]?.label || type}",${b.count},${b.revenue.toFixed(0)},${(b.revenue / b.count).toFixed(0)},${b.tax.toFixed(0)}\n`;
    });
    this.downloadCSV(csv, 'revenue-breakdown-report.csv');
  }

  generateFormalizationTargets(data: any[]): void {
    const targets = data.filter(p => !p.hasBusinessPermit || !p.hasTaxRegistration);
    let csv = 'Property Name,Owner,Phone,Revenue,Potential Tax,Willing to Formalize\n';
    targets.forEach(p => {
      const potentialTax = (p.estimatedAnnualRevenue || 0) * 0.10;
      csv += `"${p.propertyName}","${p.ownerName}","${p.ownerPhone}",${p.estimatedAnnualRevenue || 0},${potentialTax.toFixed(0)},${p.willingToFormalize === true ? 'Yes' : p.willingToFormalize === false ? 'No' : 'Unknown'}\n`;
    });
    this.downloadCSV(csv, 'formalization-targets-report.csv');
  }

  generateExecutiveSummary(data: any[]): void {
    const totalProperties = data.length;
    const formalCount = data.filter(p => p.hasBusinessPermit && p.hasTaxRegistration).length;
    const informalCount = data.filter(p => !p.hasBusinessPermit && !p.hasTaxRegistration).length;
    const totalRevenue = data.reduce((sum, p) => sum + (p.estimatedAnnualRevenue || 0), 0);
    const totalTax = data.reduce((sum, p) => sum + (p.projectedAnnualTax || 0), 0);
    const taxGap = data.filter(p => !p.hasBusinessPermit || !p.hasTaxRegistration).reduce((sum, p) => sum + (p.estimatedAnnualRevenue || 0), 0) * 0.10;

    let csv = 'Metric,Value\n';
    csv += `Total Properties,${totalProperties}\nFormal Properties,${formalCount}\nInformal Properties,${informalCount}\n`;
    csv += `Formalization Rate,${totalProperties > 0 ? ((formalCount / totalProperties) * 100).toFixed(1) : 0}%\n`;
    csv += `Total Revenue,${totalRevenue.toFixed(0)}\nTotal Tax Collected,${totalTax.toFixed(0)}\nTax Gap,${taxGap.toFixed(0)}\n`;
    this.downloadCSV(csv, 'executive-summary-report.csv');
  }

  downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  resetFilters(): void {
    this.selectedType = 'all';
    this.selectedStatus = 'all';
  }

  getCategoryBadge(category: string): string {
    const badges: { [key: string]: string } = { financial: 'bg-success', compliance: 'bg-primary', operational: 'bg-warning', summary: 'bg-info' };
    return badges[category] || 'bg-secondary';
  }

  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = { financial: 'Financial', compliance: 'Compliance', operational: 'Operational', summary: 'Summary' };
    return labels[category] || category;
  }

  getTypeLabel(type: AccommodationType): string {
    return AccommodationTypeMetadata[type]?.label || type;
  }

  getFormalCount(): number {
    return this.properties.filter(p => p.hasBusinessPermit && p.hasTaxRegistration).length;
  }
}
