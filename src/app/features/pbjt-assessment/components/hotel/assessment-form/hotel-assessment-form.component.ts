import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AccommodationService } from '../../../services/accommodation.service';
import { AccommodationType, AccommodationTypeMetadata } from '../../../models/accommodation.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-hotel-assessment-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './hotel-assessment-form.component.html',
  styleUrls: ['./hotel-assessment-form.component.scss']
})
export class HotelAssessmentFormComponent implements OnInit {
  // Form groups for each step
  typeSelectionForm!: FormGroup;
  basicInfoForm!: FormGroup;
  specificDataForm!: FormGroup;
  operationalForm!: FormGroup;
  formalizationForm!: FormGroup;

  // State
  currentStep = 0;
  totalSteps = 5;
  selectedType: AccommodationType | null = null;
  isSubmitting = false;
  isEditMode = false;
  editId: string | null = null;
  isLoading = false;

  // Image upload state
  uploadedImages: { file: File | null; preview: string; isExisting: boolean }[] = [];
  maxImages = 4;
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  isUploading = false;

  // Enums for template
  AccommodationType = AccommodationType;
  accommodationTypes: AccommodationType[] = [
    AccommodationType.HOTEL,
    AccommodationType.WISMA,
    AccommodationType.HOMESTAY,
    AccommodationType.PENGINAPAN,
    AccommodationType.RUMAH_KOS
  ];
  accommodationMetadata = AccommodationTypeMetadata;

  // Dropdown options
  starRatings = [1, 2, 3, 4, 5];
  locationTypes = [
    { value: 'ROADSIDE', label: 'Tepi Jalan' },
    { value: 'TERMINAL', label: 'Area Terminal/Stasiun' },
    { value: 'INDUSTRIAL', label: 'Area Industri' },
    { value: 'TOURIST', label: 'Area Wisata' }
  ];
  bathroomTypes = [
    { value: 'SHARED', label: 'Kamar Mandi Bersama' },
    { value: 'PRIVATE', label: 'Kamar Mandi Dalam' },
    { value: 'MIXED', label: 'Campuran' }
  ];
  kosSubtypes = [
    { value: 'KOS_PUTRA', label: 'Kos Putra' },
    { value: 'KOS_PUTRI', label: 'Kos Putri' },
    { value: 'KOS_CAMPUR', label: 'Kos Campur' }
  ];

  constructor(
    private fb: FormBuilder,
    private accommodationService: AccommodationService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.initializeForms();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.editId = id;
        this.loadAccommodationData(id);
      }
    });
  }

  initializeForms(): void {
    this.typeSelectionForm = this.fb.group({
      accommodationType: [null, Validators.required]
    });

    this.basicInfoForm = this.fb.group({
      propertyName: ['', Validators.required],
      ownerName: ['', Validators.required],
      ownerPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10,13}$/)]],
      email: ['', Validators.email],
      address: ['', Validators.required],
      latitude: [null, [Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.min(-180), Validators.max(180)]],
      kelurahan: [''],
      kecamatan: [''],
      kabupaten: ['KABUPATEN LUMAJANG'],
      totalRooms: [null, [Validators.required, Validators.min(1)]],
      buildingArea: [null],
      landArea: [null]
    });

    this.specificDataForm = this.fb.group({});
    this.operationalForm = this.fb.group({});

    this.formalizationForm = this.fb.group({
      hasBusinessPermit: [false],
      hasTaxRegistration: [false],
      willingToFormalize: [false],
      notes: ['']
    });
  }

  selectType(type: AccommodationType): void {
    this.selectedType = type;
    this.typeSelectionForm.patchValue({ accommodationType: type });
    this.buildTypeSpecificForms(type);
  }

  buildTypeSpecificForms(type: AccommodationType): void {
    switch (type) {
      case AccommodationType.HOTEL:
        this.specificDataForm = this.fb.group({
          starRating: [null],
          brandAffiliation: [''],
          hasRestaurant: [false],
          restaurantCapacity: [null],
          hasMeetingRooms: [false],
          meetingRoomCapacity: [null],
          hasPool: [false],
          hasGym: [false],
          hasSpa: [false],
          parkingSpaces: [null]
        });
        this.operationalForm = this.fb.group({
          averageOccupancyRate: [null, [Validators.min(0), Validators.max(1)]],
          averageDailyRate: [null, [Validators.min(0)]],
          marketSegment: [''],
          mainGuestType: [''],
          peakSeasonMonths: ['']
        });
        break;

      case AccommodationType.WISMA:
        this.specificDataForm = this.fb.group({
          mealService: [false],
          ownerResident: [false],
          hasParking: [false],
          hasWifi: [false]
        });
        this.operationalForm = this.fb.group({
          averageOccupancyRate: [null, [Validators.min(0), Validators.max(1)]],
          averageRatePerNight: [null, [Validators.min(0)]],
          walkInPercentage: [null],
          onlineBookingPercentage: [null],
          repeatGuestPercentage: [null],
          seasonalFactor: [0.95]
        });
        break;

      case AccommodationType.HOMESTAY:
        this.specificDataForm = this.fb.group({
          roomsForRent: [null, [Validators.min(1), Validators.max(8)]],
          totalBedrooms: [null],
          bathroomCount: [null],
          isSharedBathroom: [false],
          includesBreakfast: [false],
          includesDinner: [false],
          listedAirbnb: [false],
          listedAgoda: [false],
          listedTiket: [false]
        });
        this.operationalForm = this.fb.group({
          nightlyRate: [null, [Validators.min(0)]],
          weeklyRate: [null],
          avgGuestsPerMonth: [null, [Validators.min(0)]],
          avgNightsPerGuest: [null, [Validators.min(1)]]
        });
        break;

      case AccommodationType.PENGINAPAN:
        this.specificDataForm = this.fb.group({
          hourlyRateOffered: [false],
          hourlyRate: [null],
          sharedBathroomCount: [null],
          privateBathroomCount: [null],
          locationType: [''],
          operates24Hours: [false],
          hasSecurity: [false]
        });
        this.operationalForm = this.fb.group({
          peakDayOccupancy: [null, [Validators.min(0), Validators.max(1)]],
          regularDayOccupancy: [null, [Validators.min(0), Validators.max(1)]],
          peakDaysPerMonth: [null],
          averageRatePerNight: [null, [Validators.min(0)]]
        });
        break;

      case AccommodationType.RUMAH_KOS:
        this.specificDataForm = this.fb.group({
          kosSubtype: [''],
          bathroomType: [''],
          sharedBathroomCount: [null],
          hasKitchen: [false],
          laundryService: [false],
          cleaningService: [false],
          wifiIncluded: [false],
          electricityIncluded: [false],
          waterIncluded: [false],
          targetTenant: [''],
          distanceToCampusKm: [null],
          minimumStayMonths: [1],
          depositMonths: [1]
        });
        this.operationalForm = this.fb.group({
          typicalOccupancyRate: [null, [Validators.min(0), Validators.max(1)]],
          monthlyRatePerRoom: [null, [Validators.min(0)]],
          avgTenantDurationMonths: [null, [Validators.min(1)]]
        });
        break;
    }
  }

  loadAccommodationData(id: string): void {
    this.isLoading = true;
    this.accommodationService.getAccommodationById(id).subscribe({
      next: (data) => {
        this.selectedType = data.accommodationType;
        this.typeSelectionForm.patchValue({ accommodationType: data.accommodationType });
        this.buildTypeSpecificForms(data.accommodationType);

        this.basicInfoForm.patchValue({
          propertyName: data.propertyName,
          ownerName: data.ownerName,
          ownerPhone: data.ownerPhone,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
          kelurahan: data.kelurahan,
          kecamatan: data.kecamatan,
          kabupaten: data.kabupaten,
          totalRooms: data.totalRooms,
          buildingArea: data.buildingArea,
          landArea: data.landArea
        });

        this.formalizationForm.patchValue({
          hasBusinessPermit: data.hasBusinessPermit,
          hasTaxRegistration: data.hasTaxRegistration,
          willingToFormalize: data.willingToFormalize || false
        });

        // Load existing images
        if (data.photoUrls && data.photoUrls.length > 0) {
          this.uploadedImages = data.photoUrls.map((url: string) => ({
            file: null,
            preview: this.getImageUrl(url),
            isExisting: true
          }));
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading accommodation:', error);
        this.isLoading = false;
        this.router.navigate(['/pbjt-hotel/assessment-list']);
      }
    });
  }

  nextStep(): void {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
    }
  }

  prevStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  goToStep(step: number): void {
    if (step <= this.currentStep + 1) {
      this.currentStep = step;
    }
  }

  getCurrentLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.basicInfoForm.patchValue({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          alert('Lokasi berhasil dapatkan!');
        },
        () => {
          alert('Tidak dapat mengambil lokasi. Silakan isi manual.');
        }
      );
    }
  }

  // ==================== IMAGE UPLOAD ====================

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(files);
    }
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(input.files);
    }
  }

  handleFiles(files: FileList): void {
    const remaining = this.maxImages - this.uploadedImages.length;
    if (remaining <= 0) {
      alert(`Maksimal ${this.maxImages} foto.`);
      return;
    }

    for (let i = 0; i < files.length && this.uploadedImages.length < this.maxImages; i++) {
      const file = files[i];
      if (!this.allowedTypes.includes(file.type)) {
        alert(`Tipe file ${file.type} tidak didukung. Gunakan JPG, PNG, GIF, atau WebP.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} terlalu besar. Maksimal 10MB.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadedImages.push({
          file,
          preview: e.target?.result as string,
          isExisting: false
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(index: number): void {
    this.uploadedImages.splice(index, 1);
  }

  getImageCount(): number {
    return this.uploadedImages.length;
  }

  getImageUrl(url: string): string {
    // If it's already a full URL or data URL, return as-is
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Strip /uploads prefix and use /api/file for serving
    // DB stores: /uploads/hotel-images/filename.webp → serve as: /api/file/hotel-images/filename.webp
    const cleanPath = url.replace(/^\/uploads\//, '');
    return `/api/file/${cleanPath}`;
  }

  // ==================== SUBMIT ====================

  async onSubmit(): Promise<void> {
    if (!this.selectedType) {
      alert('Silakan pilih tipe akomodasi');
      return;
    }

    const rawData: any = {
      accommodationType: this.selectedType,
      ...this.basicInfoForm.value,
      ...this.specificDataForm.value,
      ...this.operationalForm.value,
      ...this.formalizationForm.value,
      taxRate: 0.10
    };

    // Derive formalization status
    if (rawData.hasBusinessPermit && rawData.hasTaxRegistration) {
      rawData.formalizationStatus = 'FORMAL';
    } else if (rawData.hasBusinessPermit || rawData.hasTaxRegistration) {
      rawData.formalizationStatus = 'SEMI_FORMAL';
    } else {
      rawData.formalizationStatus = 'INFORMAL';
    }

    // Clean empty strings to null
    Object.keys(rawData).forEach(key => {
      if (rawData[key] === '' || rawData[key] === undefined) {
        rawData[key] = null;
      }
    });

    this.isSubmitting = true;

    try {
      // Upload new images first
      const newFiles = this.uploadedImages
        .filter(img => img.file !== null)
        .map(img => img.file!);

      if (newFiles.length > 0) {
        this.isUploading = true;
        const uploadRes = await firstValueFrom(this.accommodationService.uploadImages(newFiles));
        this.isUploading = false;

        // Combine existing URLs + new uploaded URLs
        const existingUrls = this.uploadedImages
          .filter(img => img.isExisting)
          .map(img => img.preview)
          .filter(url => !url.startsWith('data:'))
          .filter(url => !url.startsWith('http://localhost:8080'));

        rawData.photoUrls = [
          ...existingUrls,
          ...(uploadRes.urls || [])
        ];
      } else {
        // Only existing images (no new files to upload)
        rawData.photoUrls = this.uploadedImages
          .filter(img => img.isExisting)
          .map(img => img.preview)
          .filter(url => !url.startsWith('data:'))
          .filter(url => !url.startsWith('http://localhost:8080'));
      }

      const saveObs = this.isEditMode && this.editId
        ? this.accommodationService.updateAccommodation(this.editId, rawData)
        : this.accommodationService.createAccommodation(rawData);

      await firstValueFrom(saveObs);

      const msg = this.isEditMode ? 'Assessment berhasil diupdate!' : 'Assessment berhasil dibuat!';
      alert(msg);
      this.router.navigate(['/pbjt-hotel/assessment-list']);
    } catch (error: any) {
      console.error('Error saving assessment:', error);
      this.isUploading = false;
      alert('Gagal menyimpan assessment. Silakan coba lagi.');
      this.isSubmitting = false;
    }
  }

  cancel(): void {
    this.router.navigate(['/pbjt-hotel/assessment-list']);
  }

  getTypeLabel(type: AccommodationType): string {
    return this.accommodationMetadata[type]?.label || type;
  }

  getTypeColor(type: AccommodationType): string {
    return this.accommodationMetadata[type]?.color || '#666';
  }

  getTypeRiIcon(type: AccommodationType): string {
    return this.accommodationMetadata[type]?.riIcon || 'ri-question-line';
  }

  getStepLabel(step: number): string {
    const labels = ['Tipe Akomodasi', 'Informasi Dasar', 'Detail Spesifik', 'Data Operasional', 'Status & Submit'];
    return labels[step] || '';
  }

  isStepValid(step: number): boolean {
    switch (step) {
      case 0: return this.typeSelectionForm.valid;
      case 1: return this.basicInfoForm.valid;
      case 2: return this.specificDataForm.valid;
      case 3: return this.operationalForm.valid;
      case 4: return this.formalizationForm.valid;
      default: return false;
    }
  }
}
