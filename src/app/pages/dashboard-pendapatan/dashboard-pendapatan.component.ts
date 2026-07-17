import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { PendapatanService } from '../../core/services/pendapatan.service';
import { DashboardSummary, TargetRealisasi, TrendBulanan, TopKontributor } from '../../core/models/pendapatan.model';

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

  // Filter
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [2021, 2022, 2023, 2024, 2025, 2026];

  // Expand/Collapse
  expandedIndex: number | null = null;

  // Modal Breakdown
  showBreakdownModal: boolean = false;
  selectedJenisPajak: TargetRealisasi | null = null;
  breakdownChartOptions: any;

  // Loading states
  isLoadingSummary = false;
  isLoadingChart = false;
  isLoadingTrend = false;
  isLoadingTop = false;

  // IIPA AI Proyeksi
  proyeksiIipaList: any[] = [];
  proyeksiStatus: any = null;
  showProgressModal: boolean = false;
  statusInterval: any = null;
  isTriggeringAi: boolean = false;

  constructor(private pendapatanService: PendapatanService) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loadSummary();
    this.loadTargetRealisasi();
    this.loadTrendBulanan();
    this.loadTopKontributor();
    this.loadProyeksiIipa();
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
        this.targetRealisasi = data;
        this.prepareBarChart(data);
        this.isLoadingChart = false;
      },
      error: (error) => {
        console.error('Error loading target realisasi:', error);
        this.isLoadingChart = false;
      }
    });
  }

  loadTrendBulanan(): void {
    this.isLoadingTrend = true;
    this.pendapatanService.getTrendBulanan(this.selectedYear).subscribe({
      next: (data) => {
        this.trendBulanan = data;
        this.prepareLineChart(data);
        this.isLoadingTrend = false;
      },
      error: (error) => {
        console.error('Error loading trend:', error);
        this.isLoadingTrend = false;
      }
    });
  }

  loadTopKontributor(): void {
    this.isLoadingTop = true;
    this.pendapatanService.getTopKontributor(this.selectedYear, 10).subscribe({
      next: (data) => {
        this.topKontributor = data;
        this.isLoadingTop = false;
      },
      error: (error) => {
        console.error('Error loading top kontributor:', error);
        this.isLoadingTop = false;
      }
    });
  }

  onYearChange(): void {
    this.loadAllData();
  }

  prepareBarChart(data: TargetRealisasi[]): void {
    const categories = data.map(d => d.jenisPajak);
    const targetData = data.map(d => d.target / 1000000); // Convert to millions
    const realisasiData = data.map(d => d.realisasi / 1000000);

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
        height: 400,
        toolbar: {
          show: true
        }
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '55%',
          endingShape: 'rounded'
        },
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent']
      },
      xaxis: {
        categories: categories,
        labels: {
          rotate: -45,
          style: {
            fontSize: '10px'
          }
        }
      },
      yaxis: {
        title: {
          text: 'Jumlah (Juta Rupiah)'
        },
        logarithmic: true,
        labels: {
          formatter: function (val: number) {
            // val sudah dalam juta (dari backend dibagi 1000000)
            if (val >= 1000) {
              return (val / 1000).toFixed(1) + ' M'; // Miliar
            }
            return val.toFixed(0) + ' Jt'; // Juta
          }
        }
      },
      fill: {
        opacity: 1
      },
      tooltip: {
        y: {
          formatter: function (val: number) {
            // val sudah dalam juta
            if (val >= 1000) {
              return 'Rp ' + (val / 1000).toFixed(2) + ' Miliar';
            }
            return 'Rp ' + val.toFixed(2) + ' Juta';
          }
        }
      },
      colors: ['#556ee6', '#34c38f']
    };
  }

  prepareLineChart(data: TrendBulanan[]): void {
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
    if (!item.details) return;

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
          return val.toFixed(2) + ' Jt';
        },
        offsetX: 0,
        style: {
          fontSize: '10px',
          colors: ['#fff']
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

  // --- IIPA AI PROYEKSI METHODS ---

  loadProyeksiIipa(): void {
    this.pendapatanService.getProyeksiIipa(2026).subscribe({
      next: (res) => {
        if (res && res.data) {
          this.proyeksiIipaList = res.data;
        }
      },
      error: (err) => console.error('Error loading proyeksi IIPA:', err)
    });
  }

  triggerAiAnalysis(): void {
    this.isTriggeringAi = true;
    this.showProgressModal = true;
    this.pendapatanService.triggerProyeksi().subscribe({
      next: (res) => {
        this.isTriggeringAi = false;
        this.startStatusPolling();
      },
      error: (err) => {
        this.isTriggeringAi = false;
        console.error('Error triggering AI:', err);
      }
    });
  }

  startStatusPolling(): void {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
    this.pollStatus();
    this.statusInterval = setInterval(() => {
      this.pollStatus();
    }, 1500);
  }

  pollStatus(): void {
    this.pendapatanService.getProyeksiStatus().subscribe({
      next: (res) => {
        if (res && res.data) {
          this.proyeksiStatus = res.data;
          if (!this.proyeksiStatus.isRunning && this.proyeksiStatus.percent === 100) {
            this.stopStatusPolling();
            this.loadProyeksiIipa();
          } else if (this.proyeksiStatus.isError) {
            this.stopStatusPolling();
          }
        }
      },
      error: (err) => console.error('Error polling status:', err)
    });
  }

  stopStatusPolling(): void {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
  }

  closeProgressModal(): void {
    this.showProgressModal = false;
    this.stopStatusPolling();
  }
}

