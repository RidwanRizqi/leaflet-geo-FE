import { Component, OnInit, ViewChild } from '@angular/core';
import { ApexAxisChartSeries, ApexChart, ApexXAxis, ApexDataLabels, ApexTooltip, ApexStroke, ApexYAxis, ApexGrid, ApexLegend, ChartComponent } from 'ng-apexcharts';
import { PajakService, PajakData } from '../../services/pajak.service';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  grid: ApexGrid;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  colors: string[];
};



@Component({
  selector: 'app-dashboard-pajak',
  templateUrl: './dashboard-pajak.component.html',
  styleUrls: ['./dashboard-pajak.component.scss']
})
export class DashboardPajakComponent implements OnInit {
  pajakData: PajakData[] = [];
  kategoris: string[] = [];
  chartOptionsMap: Map<string, Partial<ChartOptions>> = new Map();

  selectedCategory: string = '';
  selectedChartOptions: Partial<ChartOptions> | null = null;
  showModal: boolean = false;

  // Filter tahun - dynamic to current year
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = Array.from(
    { length: new Date().getFullYear() - 2022 + 1 },
    (_, i) => 2022 + i
  );

  // Loading and error states
  isLoading: boolean = false;
  errorMessage: string = '';

  // Color palette for charts - Modern & Colorful
  private colorPalette = [
    '#667eea', // Purple Blue
    '#f093fb', // Pink
    '#4facfe', // Sky Blue
    '#43e97b', // Green
    '#fa709a', // Coral
    '#764ba2', // Deep Purple
    '#f5576c', // Red
    '#00f2fe', // Cyan
    '#38f9d7', // Turquoise
    '#fee140'  // Yellow
  ];

  constructor(private pajakService: PajakService) { }

  ngOnInit(): void {
    this.loadPajakData();
  }

  loadPajakData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.pajakService.getPajakBulanan(this.selectedYear).subscribe({
      next: (data: PajakData[]) => {
        this.pajakData = data || [];
        this.processData();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading pajak data:', error);
        this.errorMessage = 'Gagal memuat data. Menggunakan data offline...';
        this.isLoading = false;
        // Fallback to static JSON if API fails
        this.loadFallbackData();
      }
    });
  }

  loadFallbackData(): void {
    fetch('assets/master-pajak.json')
      .then(response => response.json())
      .then((data: PajakData[]) => {
        this.pajakData = data;
        this.processData();
      })
      .catch(error => {
        console.error('Error loading fallback data:', error);
        this.errorMessage = 'Tidak dapat memuat data.';
      });
  }

  processData(): void {
    // Get unique categories
    this.kategoris = [...new Set(this.pajakData.map(item => item.kategori))];

    // Create chart options for each category
    this.updateCharts();
  }

  onYearChange(): void {
    console.log('Year changed to:', this.selectedYear);
    // Reload data from API for the new year
    this.loadPajakData();
  }

  updateCharts(): void {
    // Clear and recreate all charts
    this.chartOptionsMap.clear();
    this.kategoris.forEach((kategori, index) => {
      const chartOptions = this.createChartOptions(kategori, this.colorPalette[index % this.colorPalette.length]);
      this.chartOptionsMap.set(kategori, chartOptions);
      console.log(`Chart updated for ${kategori}, year: ${this.selectedYear}`);
    });
  }

  createChartOptions(kategori: string, color: string): Partial<ChartOptions> {
    // Filter data for this category and selected year (use == for loose comparison)
    const categoryData = this.pajakData.filter(item =>
      item.kategori === kategori && item.tahun == this.selectedYear
    );

    console.log(`Creating chart for ${kategori}, year ${this.selectedYear}, data count: ${categoryData.length}`);

    // Debug: check first item
    const sampleData = this.pajakData.find(item => item.kategori === kategori);
    if (sampleData) {
      console.log(`Sample data for ${kategori}:`, sampleData, `Type of tahun:`, typeof sampleData.tahun, `selectedYear type:`, typeof this.selectedYear);
    }

    // Get all unique months
    const allMonths = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    // Create data array with all months, filling missing values with 0
    const data = allMonths.map(month => {
      const monthData = categoryData.find(item => item.bulan === month);
      return monthData ? monthData.value : 0;
    });

    // Prepare series data for selected year only
    const series: ApexAxisChartSeries = [{
      name: this.selectedYear.toString(),
      data: data
    }];

    return {
      series: series,
      chart: {
        height: 320,
        type: 'line',
        zoom: {
          enabled: true
        },
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        },
        animations: {
          enabled: true,

          speed: 800,
          animateGradually: {
            enabled: true,
            delay: 150
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        },
        fontFamily: 'Inter, sans-serif',
        dropShadow: {
          enabled: true,
          top: 3,
          left: 0,
          blur: 4,
          opacity: 0.1
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'smooth',
        width: 3,
        lineCap: 'round'
      },
      colors: [color],
      xaxis: {
        categories: allMonths,
        labels: {
          rotate: -45,
          rotateAlways: true,
          style: {
            fontSize: '11px',
            fontWeight: 500,
            colors: '#64748b'
          }
        },
        axisBorder: {
          show: true,
          color: '#e2e8f0'
        },
        axisTicks: {
          show: true,
          color: '#e2e8f0'
        }
      },
      yaxis: {
        labels: {
          style: {
            fontSize: '11px',
            fontWeight: 500,
            colors: '#64748b'
          },
          formatter: (value) => {
            return this.formatCurrency(value);
          }
        }
      },
      grid: {
        borderColor: '#e2e8f0',
        strokeDashArray: 4,
        row: {
          colors: ['#f8fafc', 'transparent'],
          opacity: 0.5
        },
        padding: {
          top: 0,
          right: 10,
          bottom: 0,
          left: 10
        }
      },
      tooltip: {
        theme: 'light',
        x: {
          show: true
        },
        y: {
          formatter: (value) => {
            return this.formatCurrency(value);
          },
          title: {
            formatter: (seriesName) => seriesName + ':'
          }
        },
        style: {
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif'
        }
      },
      legend: {
        position: 'bottom',
        horizontalAlign: 'center',
        floating: false,
        fontSize: '12px',
        fontWeight: 500,
        offsetY: 0,
        labels: {
          colors: '#64748b'
        },
        markers: {
          shape: 'circle',
          strokeWidth: 0,
          fillColors: undefined
        },
        itemMargin: {
          horizontal: 10,
          vertical: 5
        }
      }
    };
  }

  groupByYear(data: PajakData[]): { [year: string]: PajakData[] } {
    const grouped: { [year: string]: PajakData[] } = {};

    data.forEach(item => {
      const year = item.tahun.toString();
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(item);
    });

    return grouped;
  }

  formatCurrency(value: number): string {
    // Format with Indonesian locale: periods for thousands, comma for decimal
    // Show full number with 2 decimal places
    return 'Rp ' + value.toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  adjustColor(color: string, amount: number): string {
    // Simple color adjustment
    const colors = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  openModal(kategori: string): void {
    this.selectedCategory = kategori;
    this.selectedChartOptions = this.createModalChartOptions(kategori);
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedCategory = '';
    this.selectedChartOptions = null;
  }

  createModalChartOptions(kategori: string): Partial<ChartOptions> {
    const baseOptions = this.chartOptionsMap.get(kategori);

    if (!baseOptions) {
      return {};
    }

    return {
      ...baseOptions,
      chart: {
        ...baseOptions.chart,
        height: 450,
        type: 'line'
      }
    };
  }

  getTotalByCategory(kategori: string): number {
    return this.pajakData
      .filter(item => item.kategori === kategori && item.tahun == this.selectedYear)
      .reduce((sum, item) => sum + item.value, 0);
  }

  getDataCountByCategory(kategori: string): number {
    return this.pajakData.filter(item => item.kategori === kategori && item.tahun == this.selectedYear).length;
  }

  getAverageByCategory(kategori: string): number {
    const total = this.getTotalByCategory(kategori);
    const count = this.getDataCountByCategory(kategori);
    return count > 0 ? total / count : 0;
  }

  getCategoryIcon(kategori: string): string {
    const iconMap: { [key: string]: string } = {
      'Perhotelan': 'ri-hotel-line',
      'Restoran': 'ri-restaurant-line',
      'Hiburan': 'ri-music-2-line',
      'Reklame': 'ri-advertisement-line',
      'Penerangan Jalan': 'ri-lightbulb-line',
      'Parkir': 'ri-parking-box-line',
      'Air Tanah': 'ri-drop-line',
      'Minerba': 'ri-copper-diamond-line',
      'PBB-P2': 'ri-building-line',
      'BPHTB': 'ri-file-text-line'
    };
    return iconMap[kategori] || 'ri-money-dollar-circle-line';
  }

  getChartOptions(kategori: string): Partial<ChartOptions> | undefined {
    return this.chartOptionsMap.get(kategori);
  }
}
