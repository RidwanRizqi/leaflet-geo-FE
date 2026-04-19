import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { AccommodationService } from '../../../services/accommodation.service';
import { HotelAssessmentService } from '../../../services/hotel-assessment.service';
import { AccommodationType, AccommodationTypeMetadata } from '../../../models/accommodation.model';
import { DashboardMetrics } from '../../../models/hotel-assessment.model';

Chart.register(...registerables);

interface TypeCard {
  type: AccommodationType;
  count: number;
  revenue: number;
  growth: number;
  icon: string;
  riIcon: string;
  color: string;
}

@Component({
  selector: 'app-hotel-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, BaseChartDirective],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class HotelDashboardComponent implements OnInit {
  metrics: DashboardMetrics | null = null;
  loading = true;
  selectedPeriod = 'monthly';
  Math = Math;

  typeCards: TypeCard[] = [];

  // Chart data
  revenueChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  revenueChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top' },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: Rp ${this.formatCurrency(value || 0)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `Rp ${this.formatCurrency(value as number)}`
        }
      }
    }
  };

  typeDistributionData: ChartConfiguration<'doughnut'>['data'] = {
    labels: [],
    datasets: [{ data: [], backgroundColor: [] }]
  };

  typeDistributionOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const dataset = context.dataset.data as number[];
            const total = dataset.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  formalizationData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: []
  };

  formalizationOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: true } },
    scales: {
      x: { stacked: true, beginAtZero: true },
      y: { stacked: true }
    }
  };

  constructor(
    private assessmentService: HotelAssessmentService,
    private accommodationService: AccommodationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.assessmentService.getDashboardMetrics().subscribe({
      next: (metrics) => {
        this.metrics = metrics;
        this.prepareTypeCards();
        this.prepareCharts();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard:', error);
        this.loading = false;
      }
    });
  }

  prepareTypeCards(): void {
    if (!this.metrics) return;
    this.typeCards = Object.entries(this.metrics.byType).map(([type, count]) => {
      const metadata = AccommodationTypeMetadata[type as AccommodationType];
      return {
        type: type as AccommodationType,
        count: count,
        revenue: 0,
        growth: 0,
        icon: metadata?.icon || 'help',
        riIcon: metadata?.riIcon || 'ri-question-line',
        color: metadata?.color || '#666'
      };
    });
  }

  prepareCharts(): void {
    if (!this.metrics) return;

    this.revenueChartData = {
      labels: this.metrics.trends.labels,
      datasets: [
        {
          label: 'Revenue',
          data: this.metrics.trends.revenue,
          borderColor: '#1976d2',
          backgroundColor: 'rgba(25, 118, 210, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Tax Collected',
          data: this.metrics.trends.tax,
          borderColor: '#388e3c',
          backgroundColor: 'rgba(56, 142, 60, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };

    const types = Object.keys(this.metrics.byType) as AccommodationType[];
    this.typeDistributionData = {
      labels: types.map(t => AccommodationTypeMetadata[t]?.label || t),
      datasets: [{
        data: types.map(t => this.metrics!.byType[t]),
        backgroundColor: types.map(t => AccommodationTypeMetadata[t]?.color || '#666')
      }]
    };

    // Formalization chart
    const formalData: number[] = [];
    const informalData: number[] = [];
    types.forEach(type => {
      const total = this.metrics!.byType[type];
      const formalRate = AccommodationTypeMetadata[type]?.formalRate || 0.5;
      formalData.push(Math.round(total * formalRate));
      informalData.push(Math.round(total * (1 - formalRate)));
    });

    this.formalizationData = {
      labels: types.map(t => AccommodationTypeMetadata[t]?.label || t),
      datasets: [
        { label: 'Formal', data: formalData, backgroundColor: '#4caf50' },
        { label: 'Informal', data: informalData, backgroundColor: '#f44336' }
      ]
    };
  }

  onPeriodChange(period: string): void {
    this.selectedPeriod = period;
    this.assessmentService.getRevenueTrends(period as any).subscribe({
      next: (trends) => {
        if (this.metrics) {
          this.metrics.trends = trends;
          this.prepareCharts();
        }
      }
    });
  }

  navigateToType(type: AccommodationType): void {
    this.router.navigate(['/pbjt-hotel/properties'], { queryParams: { type } });
  }

  navigateToAssessments(): void {
    this.router.navigate(['/pbjt-hotel/assessment-list']);
  }

  navigateToCreate(): void {
    this.router.navigate(['/pbjt-hotel/hotel-create']);
  }

  navigateToMap(): void {
    this.router.navigate(['/pbjt-hotel/hotel-map']);
  }

  navigateToProjections(): void {
    this.router.navigate(['/pbjt-hotel/projections']);
  }

  navigateToFormalization(): void {
    this.router.navigate(['/pbjt-hotel/formalization']);
  }

  formatCurrency(value: number): string {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(2)}M`;
    } else if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}jt`;
    } else if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}rb`;
    }
    return value.toString();
  }

  formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  getGrowthIcon(growth: number): string {
    return growth >= 0 ? 'ri-arrow-up-line' : 'ri-arrow-down-line';
  }

  getGrowthColor(growth: number): string {
    return growth >= 0 ? 'text-success' : 'text-danger';
  }
}
