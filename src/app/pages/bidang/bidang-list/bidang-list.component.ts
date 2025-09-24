import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RestApiService } from '../../../core/services/rest-api.service';

@Component({
  selector: 'app-bidang-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bidang-list.component.html',
  styleUrls: ['./bidang-list.component.scss']
})
export class BidangListComponent implements OnInit {
  
  // Data
  bidangData: any[] = [];
  
  // Pagination
  currentPage = 0;
  pageSize = 20;
  totalElements = 0;
  totalPages = 0;
  hasNext = false;
  hasPrev = false;
  
  // Loading state
  isLoading = false;
  errorMessage = '';
  
  // Search and filters
  searchTerm = '';
  selectedProvince = '';
  provinces = [
    { code: '35', name: 'Jawa Timur' },
    { code: '31', name: 'DKI Jakarta' },
    { code: '32', name: 'Jawa Barat' },
    { code: '33', name: 'Jawa Tengah' },
    { code: '34', name: 'DI Yogyakarta' }
  ];

  constructor(private restApiService: RestApiService) { }

  ngOnInit(): void {
    this.loadBidangData();
  }

  /**
   * Load bidang data from API
   */
  loadBidangData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const query: any = {
      page: this.currentPage,
      size: this.pageSize
    };

    // Add search term if provided
    if (this.searchTerm.trim()) {
      query.search = this.searchTerm.trim();
    }

    this.restApiService.getAllBidang(query).subscribe({
      next: (response) => {
        this.bidangData = response.data;
        this.totalElements = response.pagination.totalElements;
        this.totalPages = response.pagination.totalPages;
        this.hasNext = response.pagination.hasNext;
        this.hasPrev = response.pagination.hasPrev;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading bidang data:', error);
        this.errorMessage = 'Failed to load data. Please try again.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Search bidang data
   */
  onSearch(): void {
    this.currentPage = 0;
    this.loadBidangData();
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 0;
    this.loadBidangData();
  }

  /**
   * Filter by province
   */
  onProvinceChange(): void {
    this.currentPage = 0;
    if (this.selectedProvince) {
      this.loadBidangByProvince();
    } else {
      this.loadBidangData();
    }
  }

  /**
   * Load bidang by province
   */
  loadBidangByProvince(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.restApiService.getBidangByProvince(this.selectedProvince).subscribe({
      next: (data) => {
        this.bidangData = data;
        this.totalElements = data.length;
        this.totalPages = 1;
        this.hasNext = false;
        this.hasPrev = false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading bidang by province:', error);
        this.errorMessage = 'Failed to load data. Please try again.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Load next page
   */
  loadNextPage(): void {
    if (this.hasNext) {
      this.currentPage++;
      this.loadBidangData();
    }
  }

  /**
   * Load previous page
   */
  loadPrevPage(): void {
    if (this.hasPrev) {
      this.currentPage--;
      this.loadBidangData();
    }
  }

  /**
   * Refresh data
   */
  refreshData(): void {
    this.currentPage = 0;
    this.searchTerm = '';
    this.selectedProvince = '';
    this.loadBidangData();
  }

  /**
   * Get pagination info text
   */
  getPaginationInfo(): string {
    const start = (this.currentPage * this.pageSize) + 1;
    const end = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
    return `Showing ${start}-${end} of ${this.totalElements} records`;
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get province name by code
   */
  getProvinceName(code: string): string {
    const province = this.provinces.find(p => p.code === code);
    return province ? province.name : code;
  }
}
