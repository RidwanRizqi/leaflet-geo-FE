import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PbjtPotensiService } from '../../../services/pbjt-potensi.service';
import { PbjtPotensi } from '../../../models/potensi.model';

@Component({
  selector: 'app-potensi-detail',
  templateUrl: './potensi-detail.component.html',
  styleUrls: ['./potensi-detail.component.scss']
})
export class PotensiDetailComponent implements OnInit {
  // Breadcrumbs
  breadCrumbTitle: string = 'Detail Potensi PBJT';
  breadCrumbItems = [
    { label: 'PBJT Assessment' },
    { label: 'Potensi PBJT' },
    { label: 'Detail Usaha', active: true }
  ];

  potensiId: number = 0;
  potensi: PbjtPotensi | null = null;
  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private potensiService: PbjtPotensiService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.potensiId = +params['id'];
        this.loadDetail();
      }
    });
  }

  loadDetail(): void {
    this.loading = true;
    this.errorMessage = '';
    this.potensiService.getPotensiById(this.potensiId).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          this.potensi = res.data;
        } else {
          this.errorMessage = 'Data potensi tidak ditemukan.';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading detail:', err);
        this.errorMessage = 'Gagal memuat rincian data potensi.';
        this.loading = false;
      }
    });
  }

  edit(): void {
    this.router.navigate(['/pbjt-makanan/potensi/edit', this.potensiId]);
  }

  back(): void {
    this.router.navigate(['/pbjt-makanan/potensi']);
  }

  openGoogleMaps(): void {
    if (this.potensi?.latitude && this.potensi?.longitude) {
      window.open(`https://www.google.com/maps?q=${this.potensi.latitude},${this.potensi.longitude}`, '_blank');
    }
  }

  getBusinessTypeDisplay(type?: string): string {
    if (!type) return '-';
    switch (type.toUpperCase()) {
      case 'WARUNG_KECIL': return 'Warung Kecil';
      case 'RUMAH_MAKAN': return 'Rumah Makan';
      case 'RESTAURANT': return 'Restaurant';
      case 'CAFE_MODERN': return 'Café Modern';
      case 'FRANCHISE': return 'Franchise';
      default: return type;
    }
  }

  formatCurrency(value?: number): string {
    if (!value || isNaN(value)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
}
