import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PendapatanService } from '../../core/services/pendapatan.service';

@Component({
  selector: 'app-proyeksi-iipa',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proyeksi-iipa.component.html',
  styleUrl: './proyeksi-iipa.component.scss'
})
export class ProyeksiIipaComponent implements OnInit {

  proyeksiList: any[] = [];
  filteredList: any[] = [];
  summaryByTax: any[] = [];
  
  proyeksiStatus: any = null;
  showProgressModal: boolean = false;
  statusInterval: any = null;
  isTriggeringAi: boolean = false;
  isLoading: boolean = false;
  
  selectedTahun: number = 2026;
  selectedTaxFilter: string = 'ALL';
  availableTaxes: string[] = [];

  // Summary Metrics
  totalProyeksiTahun: number = 0;
  totalJenisPajak: number = 0;
  topModelPemenang: string = 'Random Forest & ETS';

  constructor(private pendapatanService: PendapatanService) {}

  ngOnInit(): void {
    this.loadProyeksiData();
    this.checkCurrentStatus();
  }

  loadProyeksiData(): void {
    this.isLoading = true;
    (this.pendapatanService as any).getProyeksiIipa(this.selectedTahun).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.proyeksiList = res.data.map((item: any) => ({
            ...item,
            formattedModel: item.modelPemenang ? item.modelPemenang.replace(/_/g, ' ') : ''
          }));
          this.processSummaryData();
          this.applyFilter();
        }
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error loading proyeksi:', err);
        this.isLoading = false;
      }
    });
  }

  processSummaryData(): void {
    this.totalProyeksiTahun = this.proyeksiList.reduce((acc, curr) => acc + (curr.nilaiProyeksi || 0), 0);
    
    const taxGroup: { [key: string]: { namaPajak: string; total: number; model: string; strategi: string } } = {};
    const taxNamesSet = new Set<string>();

    this.proyeksiList.forEach(item => {
      taxNamesSet.add(item.namaPajak);
      if (!taxGroup[item.namaPajak]) {
        taxGroup[item.namaPajak] = {
          namaPajak: item.namaPajak,
          total: 0,
          model: item.formattedModel,
          strategi: item.strategiGuncangan
        };
      }
      taxGroup[item.namaPajak].total += item.nilaiProyeksi;
    });

    this.summaryByTax = Object.values(taxGroup);
    this.availableTaxes = Array.from(taxNamesSet);
    this.totalJenisPajak = this.availableTaxes.length;
  }

  applyFilter(): void {
    if (this.selectedTaxFilter === 'ALL') {
      this.filteredList = this.proyeksiList;
    } else {
      this.filteredList = this.proyeksiList.filter(item => item.namaPajak === this.selectedTaxFilter);
    }
  }

  onTaxFilterChange(tax: string): void {
    this.selectedTaxFilter = tax;
    this.applyFilter();
  }

  checkCurrentStatus(): void {
    (this.pendapatanService as any).getProyeksiStatus().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.proyeksiStatus = res.data;
        }
      }
    });
  }

  triggerAiAnalysis(): void {
    this.isTriggeringAi = true;
    this.showProgressModal = true;
    (this.pendapatanService as any).triggerProyeksi().subscribe({
      next: (res: any) => {
        this.isTriggeringAi = false;
        this.startStatusPolling();
      },
      error: (err: any) => {
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
    (this.pendapatanService as any).getProyeksiStatus().subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.proyeksiStatus = res.data;
          if (!this.proyeksiStatus.isRunning && this.proyeksiStatus.percent === 100) {
            this.stopStatusPolling();
            this.loadProyeksiData();
          } else if (this.proyeksiStatus.isError) {
            this.stopStatusPolling();
          }
        }
      },
      error: (err: any) => console.error('Error polling status:', err)
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
