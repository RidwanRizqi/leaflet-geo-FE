import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { PendapatanService } from '../../services/pendapatan.service';
import { DashboardSummary, TargetRealisasi, TrendBulanan, TopKontributor } from '../../models/pendapatan.model';

@Component({
  selector: 'app-dashboard-pendapatan',
  standalone: true,
  imports: [CommonModule, FormsModule, NgApexchartsModule],
  templateUrl: './dashboard-pendapatan.component.html',
  styleUrl: './dashboard-pendapatan.component.scss'
})
export class DashboardPendapatanComponent implements OnInit {

  // Data
  summary: DashboardSummary | null = null;
  targetRealisasi: TargetRealisasi[] = [];
  trendBulanan: TrendBulanan[] = [];
  topKontributor: TopKontributor[] = [];

  // Filter - dynamic to current year
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = Array.from(
    { length: new Date().getFullYear() - 2021 + 1 },
    (_, i) => 2021 + i
  );

  // Expand/Collapse
  expandedIndex: number | null = null;
  expandedCalcIndex: number | null = null;

  // Modal Breakdown
  showBreakdownModal: boolean = false;
  selectedJenisPajak: TargetRealisasi | null = null;
  breakdownChartOptions: any;

  // Loading states
  isLoadingSummary = false;
  isLoadingChart = false;
  isLoadingTrend = false;
  isLoadingTop = false;

  // Chart options
  chartOptions: any;
  trendChartOptions: any;

  constructor(private pendapatanService: PendapatanService) { }

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loadSummary();
    this.loadTargetRealisasi();
    this.loadTrendBulanan();
    this.loadTopKontributor();
  }

  loadSummary(): void {
    this.isLoadingSummary = true;
    this.pendapatanService.getDashboardSummary(this.selectedYear).subscribe({
      next: (data) => {
        this.summary = data;
        this.isLoadingSummary = false;
      },
      error: (error) => {
        console.error('Error loading summary:', error);
        this.isLoadingSummary = false;
      }
    });
  }

  loadTargetRealisasi(): void {
    this.isLoadingChart = true;
    this.pendapatanService.getTargetRealisasi(this.selectedYear).subscribe({
      next: (data) => {
        // Handle null or non-array response
        this.targetRealisasi = Array.isArray(data) ? data : [];
          
        // Sort by urutan (order)
        this.targetRealisasi.sort((a, b) => (a.urutan || 0) - (b.urutan || 0));

        if (this.targetRealisasi.length > 0) {
          this.prepareBarChart(this.targetRealisasi);
        }
        this.isLoadingChart = false;
      },
      error: (error) => {
        console.error('Error loading target realisasi:', error);
        this.targetRealisasi = [];
        this.isLoadingChart = false;
      }
    });
  }

  loadTrendBulanan(): void {
    this.isLoadingTrend = true;
    this.pendapatanService.getTrendBulanan(this.selectedYear).subscribe({
      next: (data) => {
        // Handle null or non-array response
        this.trendBulanan = Array.isArray(data) ? data : [];
        if (this.trendBulanan.length > 0) {
          this.prepareLineChart(this.trendBulanan);
        }
        this.isLoadingTrend = false;
      },
      error: (error) => {
        console.error('Error loading trend:', error);
        this.trendBulanan = [];
        this.isLoadingTrend = false;
      }
    });
  }

  loadTopKontributor(): void {
    this.isLoadingTop = true;
    this.pendapatanService.getTopKontributor(this.selectedYear, 10).subscribe({
      next: (data) => {
        // Handle null or non-array response
        this.topKontributor = Array.isArray(data) ? data : [];
        this.isLoadingTop = false;
      },
      error: (error) => {
        console.error('Error loading top kontributor:', error);
        this.topKontributor = [];
        this.isLoadingTop = false;
      }
    });
  }

  onYearChange(): void {
    this.loadAllData();
  }

  prepareBarChart(data: TargetRealisasi[]): void {
    if (!data || !Array.isArray(data) || data.length === 0) {
      this.chartOptions = null;
      return;
    }
    const categories = data.map(d => d.jenisPajak);
    const rawTarget = data.map(d => d.target / 1000000); // in millions
    const rawRealisasi = data.map(d => d.realisasi / 1000000);

    // Transformasi non-linier agar nominal ratusan juta s/d 5M terlihat gagah & proporsional
    const transformVal = (v: number): number => {
      if (!v || v <= 0) return 0;
      return Math.pow(v / 50000, 0.45) * 100;
    }; 

    const inverseVal = (y: number): number => {
      if (!y || y <= 0) return 0;
      return 50000 * Math.pow(y / 100, 1 / 0.45);
    };

    const targetData = rawTarget.map(v => transformVal(v));
    const realisasiData = rawRealisasi.map(v => transformVal(v));

    this.chartOptions = {
      series: [
        {
          name: 'Target',
          data: targetData
        },
        {
          name: 'Realisasi',
          data: realisasiData
        }
      ],
      chart: {
        type: 'bar',
        height: 700,
        toolbar: {
          show: true
        }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '65%',
          borderRadius: 4,
          dataLabels: {
            position: 'top'
          }
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number, opts: any) => {
          if (!opts) return '';
          const sIndex = opts.seriesIndex;
          const dIndex = opts.dataPointIndex;
          const realVal = sIndex === 0 ? rawTarget[dIndex] : rawRealisasi[dIndex];
          if (!realVal || realVal === 0) return '0';
          if (realVal >= 1000) {
            return (realVal / 1000).toFixed(1) + 'M';
          }
          return Math.round(realVal) + 'Jt';
        },
        offsetY: -22,
        style: {
          fontSize: '10px',
          fontWeight: 600,
          colors: ['#304758']
        }
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      grid: {
        show: true,
        borderColor: '#e8ecf1',
        strokeDashArray: 4,
        yaxis: {
          lines: {
            show: true
          }
        },
        xaxis: {
          lines: {
            show: false
          }
        }
      },
      xaxis: {
        categories: categories,
        labels: {
          rotate: -45,
          rotateAlways: true,
          trim: false,
          maxHeight: 180,
          style: {
            fontSize: '11px',
            fontWeight: 500
          }
        }
      },
      yaxis: {
        title: {
          text: 'Skala Nominal (Juta - Miliar)',
          style: {
            fontSize: '12px',
            fontWeight: 600
          }
        },
        min: 0,
        max: 100,
        tickAmount: 10,
        labels: {
          formatter: (y: number) => {
            if (y <= 0) return '0';
            const realVal = inverseVal(y);
            if (realVal >= 1000) {
              const m = realVal / 1000;
              return (m >= 10 ? m.toFixed(0) : m.toFixed(1)) + ' M';
            }
            if (realVal >= 100) {
              return (Math.round(realVal / 50) * 50) + ' Jt';
            }
            return Math.round(realVal) + ' Jt';
          }
        }
      },
      fill: {
        opacity: 1
      },
      tooltip: {
        y: {
          formatter: (val: number, opts: any) => {
            if (!opts) return '';
            const sIndex = opts.seriesIndex;
            const dIndex = opts.dataPointIndex;
            const realVal = sIndex === 0 ? rawTarget[dIndex] : rawRealisasi[dIndex];
            if (!realVal || realVal === 0) return 'Rp 0';
            if (realVal >= 1000) {
              return 'Rp ' + (realVal / 1000).toFixed(2) + ' Miliar';
            }
            return 'Rp ' + realVal.toFixed(2) + ' Juta';
          }
        }
      },
      colors: ['#556ee6', '#34c38f']
    };
  }

  prepareLineChart(data: TrendBulanan[]): void {
    if (!data || !Array.isArray(data) || data.length === 0) {
      this.trendChartOptions = null;
      return;
    }
    const categories = data.map(d => d.namaBulan);
    const realisasiData = data.map(d => d.realisasiKumulatif / 1000000);

    this.trendChartOptions = {
      series: [{
        name: 'Realisasi Kumulatif',
        data: realisasiData
      }],
      chart: {
        height: 350,
        type: 'line',
        toolbar: {
          show: true
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      xaxis: {
        categories: categories
      },
      yaxis: {
        title: {
          text: 'Realisasi Kumulatif (Juta Rupiah)'
        },
        labels: {
          formatter: function (val: number) {
            return val.toFixed(0);
          }
        }
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return 'Rp ' + val.toFixed(2) + ' Juta';
          }
        }
      },
      colors: ['#556ee6']
    };
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('id-ID').format(value);
  }

  getProgressBarColor(percentage: number): string {
    if (percentage >= 90) return 'success';
    if (percentage >= 70) return 'info';
    if (percentage >= 50) return 'warning';
    return 'danger';
  }

  toggleExpand(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  toggleCalc(index: number): void {
    this.expandedCalcIndex = this.expandedCalcIndex === index ? null : index;
  }

  openBreakdownModal(item: TargetRealisasi): void {
    this.selectedJenisPajak = item;
    this.showBreakdownModal = true;

    if (item.details && item.details.length > 0) {
      this.prepareBreakdownChart(item);
    }
  }

  closeBreakdownModal(): void {
    this.showBreakdownModal = false;
    this.selectedJenisPajak = null;
  }

  prepareBreakdownChart(item: TargetRealisasi): void {
    // Handle case where details is empty or null
    if (!item.details || item.details.length === 0) {
      this.breakdownChartOptions = {
        chart: {
          type: 'bar',
          height: 350
        },
        series: [],
        xaxis: {
          categories: ['No Data']
        },
        plotOptions: {
          bar: {
            horizontal: true,
            barHeight: '70%'
          }
        }
      };
      return;
    }

    const labels = item.details.map(d => d.namaRekening);
    const values = item.details.map(d => d.realisasi / 1000000); // Convert to millions

    this.breakdownChartOptions = {
      series: [{
        name: 'Realisasi',
        data: values
      }],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: {
          show: true
        }
      },
      plotOptions: {
        bar: {
          borderRadius: 8,
          horizontal: true,
          barHeight: '70%',
          distributed: true,
          dataLabels: {
            position: 'top'
          }
        }
      },
      colors: ['#556ee6', '#34c38f', '#f46a6a', '#50a5f1', '#f1b44c', '#343a40', '#74788d', '#e83e8c', '#6610f2', '#20c997'],
      dataLabels: {
        enabled: true,
        formatter: function (val: number) {
          if (val === 0) return '0';
          if (val >= 1000) {
            return (val / 1000).toFixed(1) + ' M';
          }
          return val.toFixed(1) + ' Jt';
        },
        offsetX: 5,
        style: {
          fontSize: '10px',
          colors: ['#304758']
        }
      },
      xaxis: {
        categories: labels,
        labels: {
          formatter: function (val: number) {
            return val.toFixed(0) + ' Jt';
          }
        }
      },
      yaxis: {
        labels: {
          show: true,
          maxWidth: 200,
          style: {
            fontSize: '11px'
          }
        }
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            return 'Rp ' + (val).toFixed(2) + ' Juta';
          }
        }
      },
      legend: {
        show: false
      }
    };
  }
}

