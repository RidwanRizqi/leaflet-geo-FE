import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { AccommodationService } from '../../../services/accommodation.service';
import { AccommodationType, AccommodationTypeMetadata } from '../../../models/accommodation.model';

Chart.register(...registerables);

interface ProjectionData {
  year: number;
  conservative: number;
  moderate: number;
  aggressive: number;
  actual?: number;
}

@Component({
  selector: 'app-hotel-projection-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './projection-dashboard.component.html',
  styleUrls: ['./projection-dashboard.component.scss']
})
export class HotelProjectionDashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('typeChart') typeChartRef!: ElementRef<HTMLCanvasElement>;

  private revenueChart?: Chart;
  private typeChart?: Chart;

  loading: boolean = true;
  properties: any[] = [];
  projections: ProjectionData[] = [];

  currentYear = new Date().getFullYear();
  baseYear = this.currentYear;
  projectionYears = 5;
  selectedScenario: 'conservative' | 'moderate' | 'aggressive' = 'moderate';
  selectedType: string = 'all';

  growthRates = { conservative: 5, moderate: 10, aggressive: 15 };
  taxRate = 0.10;

  currentRevenue = 0;
  currentTax = 0;
  scenarios = {
    conservative: { totalRevenue: 0, avgGrowth: 5, totalTax: 0, description: 'Low growth scenario' },
    moderate: { totalRevenue: 0, avgGrowth: 10, totalTax: 0, description: 'Expected growth scenario' },
    aggressive: { totalRevenue: 0, avgGrowth: 15, totalTax: 0, description: 'High growth scenario' }
  };
  scenarioKeys: ('conservative' | 'moderate' | 'aggressive')[] = ['conservative', 'moderate', 'aggressive'];

  typeBreakdown: { type: string; revenue: number; percentage: number }[] = [];

  AccommodationType = AccommodationType;
  accommodationMetadata = AccommodationTypeMetadata;
  accommodationTypes = [
    { value: 'all', label: 'Semua Tipe' },
    ...Object.values(AccommodationType).map(type => ({
      value: type,
      label: AccommodationTypeMetadata[type]?.label || type
    }))
  ];

  constructor(private accommodationService: AccommodationService) {}

  ngOnInit(): void {
    this.loadProperties();
  }

  ngAfterViewInit(): void {}

  loadProperties(): void {
    this.loading = true;
    this.accommodationService.getAccommodations({ pageSize: 9999 }).subscribe({
      next: (response: any) => {
        this.properties = Array.isArray(response) ? response : (response?.items || []);
        this.calculateProjections();
        this.loading = false;
        setTimeout(() => this.initializeCharts(), 100);
      },
      error: (error: any) => {
        console.error('Error loading properties:', error);
        this.loading = false;
      }
    });
  }

  calculateProjections(): void {
    let filteredProperties = this.properties;
    if (this.selectedType !== 'all') {
      filteredProperties = this.properties.filter(p => p.accommodationType === this.selectedType);
    }

    this.currentRevenue = filteredProperties.reduce((sum, p) => sum + (p.estimatedAnnualRevenue || 0), 0);
    this.currentTax = this.currentRevenue * this.taxRate;

    this.projections = [];
    for (let i = 0; i <= this.projectionYears; i++) {
      const year = this.baseYear + i;
      const projection: ProjectionData = {
        year,
        conservative: this.currentRevenue * Math.pow(1 + this.growthRates.conservative / 100, i),
        moderate: this.currentRevenue * Math.pow(1 + this.growthRates.moderate / 100, i),
        aggressive: this.currentRevenue * Math.pow(1 + this.growthRates.aggressive / 100, i)
      };
      if (i === 0) projection.actual = this.currentRevenue;
      this.projections.push(projection);
    }

    const conservativeTotal = this.projections.reduce((sum, p) => sum + p.conservative, 0);
    this.scenarios.conservative = { totalRevenue: conservativeTotal, avgGrowth: this.growthRates.conservative, totalTax: conservativeTotal * this.taxRate, description: 'Low growth scenario' };

    const moderateTotal = this.projections.reduce((sum, p) => sum + p.moderate, 0);
    this.scenarios.moderate = { totalRevenue: moderateTotal, avgGrowth: this.growthRates.moderate, totalTax: moderateTotal * this.taxRate, description: 'Expected growth scenario' };

    const aggressiveTotal = this.projections.reduce((sum, p) => sum + p.aggressive, 0);
    this.scenarios.aggressive = { totalRevenue: aggressiveTotal, avgGrowth: this.growthRates.aggressive, totalTax: aggressiveTotal * this.taxRate, description: 'High growth scenario' };

    this.calculateTypeBreakdown();
  }

  calculateTypeBreakdown(): void {
    const breakdown: { [key: string]: number } = {};
    let total = 0;
    this.properties.forEach(property => {
      const type = property.accommodationType;
      const revenue = property.estimatedAnnualRevenue || 0;
      if (!breakdown[type]) breakdown[type] = 0;
      breakdown[type] += revenue;
      total += revenue;
    });

    this.typeBreakdown = Object.keys(breakdown).map(type => ({
      type,
      revenue: breakdown[type],
      percentage: total > 0 ? (breakdown[type] / total) * 100 : 0
    })).sort((a, b) => b.revenue - a.revenue);
  }

  initializeCharts(): void {
    this.createRevenueChart();
    this.createTypeChart();
  }

  createRevenueChart(): void {
    if (!this.revenueChartRef) return;
    if (this.revenueChart) this.revenueChart.destroy();

    const ctx = this.revenueChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.revenueChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.projections.map(p => p.year.toString()),
        datasets: [
          { label: 'Actual', data: this.projections.map(p => p.actual || null), borderColor: '#4CAF50', backgroundColor: 'rgba(76,175,80,0.1)', borderWidth: 3, pointRadius: 6 },
          { label: 'Conservative (5%)', data: this.projections.map(p => p.conservative), borderColor: '#FF9800', borderWidth: 2, borderDash: [5, 5], pointRadius: 4 },
          { label: 'Moderate (10%)', data: this.projections.map(p => p.moderate), borderColor: '#2196F3', borderWidth: 2, pointRadius: 4 },
          { label: 'Aggressive (15%)', data: this.projections.map(p => p.aggressive), borderColor: '#F44336', borderWidth: 2, borderDash: [5, 5], pointRadius: 4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: '5-Year Revenue Projections', font: { size: 16, weight: 'bold' } },
          legend: { display: true, position: 'bottom' },
          tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${this.formatCurrency(ctx.parsed.y || 0)}` } }
        },
        scales: { y: { beginAtZero: true, ticks: { callback: (value) => this.formatCurrencyShort(+value) } } }
      }
    });
  }

  createTypeChart(): void {
    if (!this.typeChartRef) return;
    if (this.typeChart) this.typeChart.destroy();

    const ctx = this.typeChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const colors = this.typeBreakdown.map(item => this.accommodationMetadata[item.type as AccommodationType]?.color || '#666');

    this.typeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.typeBreakdown.map(item => this.accommodationMetadata[item.type as AccommodationType]?.label || item.type),
        datasets: [{ data: this.typeBreakdown.map(item => item.revenue), backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: 'Revenue by Accommodation Type', font: { size: 16, weight: 'bold' } },
          legend: { display: true, position: 'right' }
        }
      }
    });
  }

  onFilterChange(): void {
    this.calculateProjections();
    this.initializeCharts();
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
  }

  formatCurrencyShort(value: number): string {
    if (value >= 1000000000) return `Rp ${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `Rp ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `Rp ${(value / 1000).toFixed(0)}K`;
    return `Rp ${value}`;
  }

  exportData(): void {
    let csv = 'Year,Conservative,Moderate,Aggressive\n';
    this.projections.forEach(p => {
      csv += `${p.year},${p.conservative.toFixed(0)},${p.moderate.toFixed(0)},${p.aggressive.toFixed(0)}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-projections-${this.baseYear}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
