import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PbjtAssessmentService } from '../../services/pbjt-assessment.service';
import { AssessmentRequest } from '../../models/assessment.model';
import { BprdApiService } from '../../../../core/services/bprd-api.service';
import { RestApiService } from '../../../../core/services/rest-api.service';

interface DropdownOption {
  value: string;
  label: string;
  kdKec?: string;
}

interface ImagePreview {
  file: File;
  url: string;
  name: string;
}

@Component({
  selector: 'app-assessment-form',
  templateUrl: './assessment-form.component.html',
  styleUrls: ['./assessment-form.component.scss']
})
export class AssessmentFormComponent implements OnInit {
  // Separate form groups for each step
  step1Form!: FormGroup; // Business Profile
  step2Form!: FormGroup; // Location
  step3Form!: FormGroup; // Observations

  submitted = false;
  loading = false;
  isEditMode = false;
  assessmentId: number = 0;
  currentStep = 0;

  // Dropdown data
  kecamatanList: DropdownOption[] = [];
  kelurahanList: DropdownOption[] = [];
  isLoadingKecamatan = false;
  isLoadingKelurahan = false;
  selectedKdKec: string | null = null;

  // Calculation result
  calculationResult: any = null;
  isCalculating = false;

  // Image upload
  uploadedImages: ImagePreview[] = [];
  maxImages = 4;
  isDragOver = false;
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  businessTypes = [
    { value: 'RESTAURANT', label: 'Restaurant' },
    { value: 'CAFE', label: 'Cafe' },
    { value: 'BAR', label: 'Bar' },
    { value: 'HOTEL', label: 'Hotel' },
    { value: 'OTHER', label: 'Other' }
  ];

  dayTypes = [
    { value: 'WEEKDAY_PEAK', label: 'Hari Kerja - Ramai (Siang 12-14)' },
    { value: 'WEEKDAY_OFFPEAK', label: 'Hari Kerja - Sepi (Sore 15-17)' },
    { value: 'WEEKEND_PEAK', label: 'Akhir Pekan - Ramai (Malam 18-20)' },
    { value: 'WEEKEND_OFFPEAK', label: 'Akhir Pekan - Sepi (Sore 15-17)' }
  ];

  roadTypes = [
    { value: 'ARTERI', label: 'Jalan Arteri (+20%)' },
    { value: 'KOLEKTOR', label: 'Jalan Kolektor (+15%)' },
    { value: 'LOKAL', label: 'Jalan Lokal (+5%)' },
    { value: 'GANG', label: 'Gang / Jalan Kecil (0%)' }
  ];

  // UI State for Step 3 Methods
  showSampleMethod = true;
  showMenuMethod = true;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private assessmentService: PbjtAssessmentService,
    private bprdApiService: BprdApiService,
    private restApiService: RestApiService
  ) {}

  ngOnInit(): void {
    console.log('🔄 Assessment form ngOnInit called');
    this.initializeForms();

    // Load kecamatan dropdown data
    console.log('📡 Loading kecamatan list...');
    this.loadKecamatanList();

    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.assessmentId = +params['id'];
        this.loadAssessment();
      } else {
        // Add 2 initial observation rows for new assessment
        this.addObservation();
        this.addObservation();
      }
    });
  }

  initializeForms(): void {
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Step 1: Business Profile
    this.step1Form = this.fb.group({
      businessId: ['', [Validators.required, Validators.maxLength(50)]],
      businessName: ['', Validators.required],
      businessType: ['RESTAURANT', Validators.required],
      seatingCapacity: [10, [Validators.required, Validators.min(5), Validators.max(500)]],
      buildingArea: [null],
      operatingHoursStart: ['09:00', Validators.required],
      operatingHoursEnd: ['22:00', Validators.required],
      assessmentDate: [todayStr, Validators.required],
      // Menu Method Inputs
      openingDaysPerMonth: [25, [Validators.min(1), Validators.max(31)]],
      menuItems: this.fb.array([])
    });

    this.addMenuItem(); // Add initial menu item row

    // Initially toggle both methods to true (or as needed)
    this.showSampleMethod = true;
    this.showMenuMethod = true;

    // Step 2: Location + Surveyor
    this.step2Form = this.fb.group({
      address: ['', Validators.required],
      kelurahan: ['', Validators.required],
      kecamatan: ['', Validators.required],
      kabupaten: ['Lumajang', Validators.required],
      latitude: [null, [Validators.required, Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.required, Validators.min(-180), Validators.max(180)]],
      // Advanced Location Factors
      roadType: [''],
      nearSchool: [false],
      nearOffice: [false],
      nearMarket: [false],
      surveyorId: ['', Validators.required]  // Required by backend
    });

    // Step 3: Observations
    // Made optional to support Menu-Only Method
    this.step3Form = this.fb.group({
      observations: this.fb.array([])
    });
  }

  get observations(): FormArray {
    return this.step3Form.get('observations') as FormArray;
  }

  get menuItems(): FormArray {
    return this.step1Form.get('menuItems') as FormArray;
  }

  addMenuItem(): void {
    const itemGroup = this.fb.group({
      name: ['', Validators.required],
      price: [null, [Validators.required, Validators.min(1)]],
      category: ['FOOD', Validators.required]
    });
    this.menuItems.push(itemGroup);
  }

  removeMenuItem(index: number): void {
    if (this.menuItems.length > 1) {
      this.menuItems.removeAt(index);
    } else {
        // Reset if only one
        this.menuItems.at(0).reset({category: 'FOOD'});
    }
  }

  toggleSampleMethod() {
      this.showSampleMethod = !this.showSampleMethod;
  }

  toggleMenuMethod() {
      this.showMenuMethod = !this.showMenuMethod;
  }

  asFormGroup(control: any): FormGroup {
      return control as FormGroup;
  }

  createObservationFormGroup(): FormGroup {
    return this.fb.group({
      observationDate: ['', Validators.required],
      dayType: ['WEEKDAY_PEAK', Validators.required],
      visitors: [10, [Validators.required, Validators.min(1), Validators.max(1000)]],
      durationHours: [2, [Validators.required, Validators.min(0.5), Validators.max(24)]],
      // Samples are optional if using Menu Method
      sampleTransactions: this.fb.array([]),
      notes: ['']
    });
  }

  /**
   * Create a FormGroup for a single sample transaction with amount and notes
   */
  createSampleTransactionFormGroup(): FormGroup {
    return this.fb.group({
      amount: [null, [Validators.required, Validators.min(1000)]],
      notes: ['']
    });
  }

  /**
   * Get sample transactions FormArray for a specific observation
   */
  getSampleTransactions(obsIndex: number): FormArray {
    return this.observations.at(obsIndex).get('sampleTransactions') as FormArray;
  }

  /**
   * Add sample transaction input
   */
  addSampleTransaction(obsIndex: number): void {
    const samples = this.getSampleTransactions(obsIndex);
    if (samples.length < 30) {
      samples.push(this.createSampleTransactionFormGroup());
    }
  }

  /**
   * Remove sample transaction input (minimum 5 required)
   */
  removeSampleTransaction(obsIndex: number, sampleIndex: number): void {
    const samples = this.getSampleTransactions(obsIndex);
    if (samples.length > 5) {
      samples.removeAt(sampleIndex);
    }
  }

  /**
   * Calculate average transaction for display
   */
  calculateAvgTransaction(obsIndex: number): number {
    const samples = this.getSampleTransactions(obsIndex);
    const validAmounts = samples.controls
      .map(control => control.get('amount')?.value)
      .filter(val => val !== null && !isNaN(val) && val > 0);

    if (validAmounts.length === 0) return 0;
    return Math.round(validAmounts.reduce((sum, val) => sum + val, 0) / validAmounts.length);
  }

  addObservation(): void {
    if (this.observations.length < 5) {
      const obsGroup = this.createObservationFormGroup();
      this.observations.push(obsGroup);

      // Add 10 default sample transaction inputs
      const newIndex = this.observations.length - 1;
      for (let i = 0; i < 10; i++) {
        this.addSampleTransaction(newIndex);
      }
    }
  }

  removeObservation(index: number): void {
    this.observations.removeAt(index);
  }

  loadAssessment(): void {
    this.loading = true;
    this.assessmentService.getAssessmentById(this.assessmentId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const assessment = response.data;

          // Patch Step 1
          this.step1Form.patchValue({
            businessId: assessment.businessId,
            businessName: assessment.businessName,
            businessType: assessment.businessType,
            seatingCapacity: assessment.seatingCapacity,
            buildingArea: assessment.buildingArea,
            operatingHoursStart: assessment.operatingHoursStart,
            operatingHoursEnd: assessment.operatingHoursEnd,
            assessmentDate: assessment.assessmentDate?.split('T')[0]
          });

          // Patch Menu Items for Menu Based Method
          if (assessment.menuItems && assessment.menuItems.length > 0) {
             this.menuItems.clear(); // Clear default initialized item

             assessment.menuItems.forEach((item: any) => {
                 const itemGroup = this.fb.group({
                    name: [item.name, Validators.required],
                    price: [item.price, [Validators.required, Validators.min(1)]],
                    category: [item.category, Validators.required]
                 });
                 this.menuItems.push(itemGroup);
             });
          }

          if (assessment.openingDaysPerMonth) {
              this.step1Form.patchValue({
                  openingDaysPerMonth: assessment.openingDaysPerMonth
              });
          }

          // Load existing images if any
          if (assessment.photoUrls && assessment.photoUrls.length > 0) {
            assessment.photoUrls.forEach(url => {
              // Create preview for existing images
              const fullUrl = url.startsWith('http') ? url : `http://localhost:8080${url}`;
              this.uploadedImages.push({
                file: new File([], 'existing-image'), // Dummy file for existing images
                url: fullUrl,
                name: url.split('/').pop() || 'image'
              });
            });
          }

          // Patch Step 2
          if (assessment.location) {
            this.step2Form.patchValue({
              address: assessment.location.address,
              kelurahan: assessment.location.kelurahan,
              kecamatan: assessment.location.kecamatan,
              kabupaten: assessment.location.kabupaten,
              latitude: assessment.location.latitude,
              longitude: assessment.location.longitude
            });
          }

          // Patch surveyor ID - surveyorId ada di root level assessment object
          this.step2Form.patchValue({
            surveyorId: assessment.surveyorId || ''
          });

          // Patch Step 3 - Observations
          if (assessment.observations && assessment.observations.length > 0) {
            assessment.observations.forEach(obs => {
              const obsGroup = this.createObservationFormGroup();

              // Format observationDate: API returns "2012-02-16T20:29:00", we need "2012-02-16" for date input
              let formattedDate = '';
              if (obs.observationDate) {
                const dateStr = obs.observationDate.toString();
                formattedDate = dateStr.split('T')[0]; // Extract just the date part
              }

              obsGroup.patchValue({
                observationDate: formattedDate,
                dayType: obs.dayType,
                visitors: obs.visitors,
                durationHours: obs.durationHours,
                notes: obs.notes || ''
              });

              // Load sample transactions
              const samplesArray = obsGroup.get('sampleTransactions') as FormArray;
              if (obs.sampleTransactions && obs.sampleTransactions.length > 0) {
                obs.sampleTransactions.forEach((tx: any) => {
                  const txGroup = this.createSampleTransactionFormGroup();
                  txGroup.patchValue({
                    amount: tx.amount,
                    notes: tx.notes || ''
                  });
                  samplesArray.push(txGroup);
                });
              }

              this.observations.push(obsGroup);
            });
          }
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading assessment:', error);
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    this.submitted = true;

    // Validate all steps and collect errors
    const errors: string[] = [];

    // Check Step 1 errors
    if (this.step1Form.invalid) {
      const step1Errors = this.getFormErrors(this.step1Form, 'Step 1 - Profil Usaha');
      errors.push(...step1Errors);
    }

    // Check Step 2 errors
    if (this.step2Form.invalid) {
      const step2Errors = this.getFormErrors(this.step2Form, 'Step 2 - Lokasi');
      errors.push(...step2Errors);
    }

    // Check Step 3 errors (observations)
    // Validate if user has provided EITHER Observations OR Menu Items
    const validObservations = this.observations.controls.filter(obs => {
        return !!obs.get('observationDate')?.value;
    });

    // Check valid Menu Items
    let hasMenuItems = false;
    if (this.showMenuMethod) {
        hasMenuItems = this.menuItems.controls.some(item => {
            const val = item.value;
            return val.name && val.price > 0 && val.category;
        });
    }

    if (this.showSampleMethod && validObservations.length === 0) {
        errors.push('Metode Sample aktif: Minimal 1 Observasi lengkap diperlukan');
    }

    if (this.showMenuMethod && !hasMenuItems) {
        errors.push('Metode Menu aktif: Minimal 1 Menu lengkap diperlukan');
    }

    if (!this.showSampleMethod && !this.showMenuMethod) {
       errors.push('Wajib memilih minimal satu metode perhitungan (Sample atau Menu)');
    }

    // Validate only filled observations details IF method is active
    if (this.showSampleMethod) {
        this.observations.controls.forEach((obs, i) => {
          const obsGroup = obs as FormGroup;
          const date = obsGroup.get('observationDate')?.value;

          // Only validate if observation has a date (user started filling it)
          if (date) {
            if (!obsGroup.get('dayType')?.value) {
              errors.push(`Observasi #${i + 1}: Tipe hari belum dipilih`);
            }
            if (!obsGroup.get('visitors')?.value || obsGroup.get('visitors')?.value < 1) {
              errors.push(`Observasi #${i + 1}: Jumlah pengunjung harus diisi`);
            }
            if (!obsGroup.get('durationHours')?.value || obsGroup.get('durationHours')?.value < 0.5) {
              errors.push(`Observasi #${i + 1}: Durasi harus diisi`);
            }
          }
        });
    }

    if (errors.length > 0) {
      alert('Field yang belum lengkap:\n\n' + errors.join('\n'));
      this.markFormGroupTouched(this.step1Form);
      this.markFormGroupTouched(this.step2Form);
      this.markFormGroupTouched(this.step3Form);
      return;
    }

    this.loading = true;

    // Step 1: Upload only NEW images (not existing ones)
    const newImages = this.uploadedImages.filter(img => img.file.size > 0); // Filter out dummy files

    if (newImages.length > 0) {
      console.log('📤 Uploading new images...');
      const files = newImages.map(img => img.file);

      this.assessmentService.uploadImages(files).subscribe({
        next: (uploadResponse) => {
          console.log('✅ Images uploaded:', uploadResponse);
          if (uploadResponse.success && uploadResponse.urls) {
            // Combine existing image URLs with new ones
            const existingUrls = this.uploadedImages
              .filter(img => img.file.size === 0) // These are existing images
              .map(img => {
                // Extract relative URL from full URL
                const url = img.url;
                return url.includes('/uploads/') ? url.substring(url.indexOf('/uploads/')) : url;
              });
            const allImageUrls = [...existingUrls, ...uploadResponse.urls];
            // Step 2: Submit assessment with all image URLs
            this.submitAssessmentData(allImageUrls);
          } else {
            this.loading = false;
            alert('Gagal upload gambar!');
          }
        },
        error: (error) => {
          console.error('❌ Error uploading images:', error);
          this.loading = false;
          alert('Gagal upload gambar: ' + (error.error?.message || error.message));
        }
      });
    } else {
      // No new images, use existing URLs only
      const existingUrls = this.uploadedImages
        .map(img => {
          const url = img.url;
          return url.includes('/uploads/') ? url.substring(url.indexOf('/uploads/')) : url;
        });
      this.submitAssessmentData(existingUrls);
    }
  }

  /**
   * Calculate estimates before submitting
   */
  calculateEstimates(): void {
    // Basic validation
    if (this.step1Form.invalid) {
      this.markFormGroupTouched(this.step1Form);
      alert("Mohon lengkapi profil usaha (Step 1) terlebih dahulu");
      return;
    }

    this.isCalculating = true;
    const request = this.prepareRequest([]); // Empty images for calculation

    // DEBUG: Log request to verify data
    console.log('🔍 [DEBUG] Calculate Request:', JSON.stringify(request, null, 2));
    console.log('🔍 [DEBUG] showMenuMethod:', this.showMenuMethod);
    console.log('🔍 [DEBUG] showSampleMethod:', this.showSampleMethod);
    console.log('🔍 [DEBUG] menuItems from step1Form:', this.step1Form.get('menuItems')?.value);

    this.assessmentService.calculateAssessment(request).subscribe({
      next: (response) => {
        console.log('✅ [DEBUG] Calculation Response:', response);
        this.calculationResult = response.data;
        this.isCalculating = false;
        // Optionally scroll to result
      },
      error: (err) => {
        console.error("Calculation error", err);
        alert("Gagal melakukan kalkulasi: " + (err.error?.message || err.message || 'Unknown error'));
        this.isCalculating = false;
      }
    });
  }

  private prepareRequest(imageUrls: string[] = []): AssessmentRequest {
    // Merge all step forms
    const step1Value = this.step1Form.value;
    const step2Value = this.step2Form.value;
    const step3Value = this.step3Form.getRawValue();

    // Build request matching backend AssessmentRequestDTO (flat structure)
    return {
      // Business info
      businessId: step1Value.businessId,
      businessName: step1Value.businessName,
      businessType: step1Value.businessType,
      seatingCapacity: step1Value.seatingCapacity,
      buildingArea: step1Value.buildingArea || null,
      operatingHoursStart: step1Value.operatingHoursStart,
      operatingHoursEnd: step1Value.operatingHoursEnd,
      assessmentDate: step1Value.assessmentDate,

      // Menu Items & Opening Days (New Mappings)
      // Only include if Menu Method is active
      openingDaysPerMonth: this.showMenuMethod ? step1Value.openingDaysPerMonth : null,
      menuItems: this.showMenuMethod ? (step1Value.menuItems || [])
        .filter((item: any) => item.name && item.price > 0 && item.category) // Basic filtering
        .map((item: any) => ({
            name: item.name,
            price: item.price,
            category: item.category
        })) : [],

      // Location - FLAT (not nested)
      address: step2Value.address,
      kelurahan: step2Value.kelurahan,
      kecamatan: step2Value.kecamatan,
      kabupaten: step2Value.kabupaten,
      latitude: step2Value.latitude,
      longitude: step2Value.longitude,

      // Advanced Location Factors
      roadType: step2Value.roadType || null,
      nearSchool: !!step2Value.nearSchool,
      nearOffice: !!step2Value.nearOffice,
      nearMarket: !!step2Value.nearMarket,

      // Surveyor
      surveyorId: step2Value.surveyorId,

      // Image URLs
      photoUrls: imageUrls,

      // Observations with sampleTransactions
      // Filter hanya observasi yang terisi (ada tanggal)
      observations: step3Value.observations
        .filter((obs: any) => {
          return !!obs.observationDate;
        })
        .map((obs: any) => ({
          observationDate: this.formatObservationDate(obs.observationDate),
          dayType: obs.dayType,
          visitors: obs.visitors,
          durationHours: obs.durationHours,
          // Only include sample transactions if Sample Method is active
          sampleTransactions: this.showSampleMethod ? (obs.sampleTransactions || [])
            .filter((tx: any) => tx.amount !== null && tx.amount !== undefined && tx.amount > 0)
            .map((tx: any) => ({
              amount: tx.amount,
              notes: tx.notes || ''
            })) : [],
          notes: obs.notes || ''
        }))
    };
  }

  /**
   * Submit assessment data with image URLs
   */
  private submitAssessmentData(imageUrls: string[]): void {
    const request = this.prepareRequest(imageUrls);

    const operation = this.isEditMode
      ? this.assessmentService.updateAssessment(this.assessmentId, request)
      : this.assessmentService.createAssessment(request);

    operation.subscribe({
      next: (response) => {
        if (response.success) {
          alert(`Assessment berhasil ${this.isEditMode ? 'diupdate' : 'dibuat'}!`);
          this.router.navigate(['/pbjt-assessment']);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error saving assessment:', error);
        alert('Gagal menyimpan assessment!');
        this.loading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/pbjt-assessment']);
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();

      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(c => {
          if (c instanceof FormGroup) {
            this.markFormGroupTouched(c);
          }
        });
      }
    });
  }

  /**
   * Get form validation errors for display
   */
  private getFormErrors(formGroup: FormGroup, stepName: string): string[] {
    const errors: string[] = [];
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control?.invalid) {
        errors.push(`${stepName}: ${this.getFieldLabel(key)} belum diisi/tidak valid`);
      }
    });
    return errors;
  }

  /**
   * Get human-readable field labels
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      businessId: 'Business ID',
      businessName: 'Nama Usaha',
      businessType: 'Tipe Usaha',
      seatingCapacity: 'Kapasitas Tempat Duduk',
      buildingArea: 'Luas Bangunan',
      operatingHoursStart: 'Jam Buka',
      operatingHoursEnd: 'Jam Tutup',
      assessmentDate: 'Tanggal Assessment',
      address: 'Alamat',
      kelurahan: 'Kelurahan',
      kecamatan: 'Kecamatan',
      kabupaten: 'Kabupaten',
      latitude: 'Latitude',
      longitude: 'Longitude',
      surveyorId: 'Surveyor ID',
      observationDate: 'Tanggal Observasi',
      dayType: 'Tipe Hari',
      visitors: 'Jumlah Pengunjung',
      durationHours: 'Durasi (Jam)',
      sampleTransactions: 'Sample Transaksi',
      notes: 'Catatan'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Format observation date for backend (LocalDateTime format)
   * Input from datetime-local: "2024-01-15T10:30" or date: "2024-01-15"
   * Output: "2024-01-15T10:30:00" (valid LocalDateTime)
   */
  private formatObservationDate(dateValue: string): string {
    if (!dateValue) return '';

    // If it's already a full datetime (from datetime-local input)
    if (dateValue.includes('T')) {
      // datetime-local gives "2024-01-15T10:30", we need "2024-01-15T10:30:00"
      const parts = dateValue.split('T');
      const datePart = parts[0];
      let timePart = parts[1] || '12:00';

      // Ensure time has seconds
      if (timePart.split(':').length === 2) {
        timePart += ':00';
      }

      return `${datePart}T${timePart}`;
    } else {
      // Just a date, add default time
      return `${dateValue}T12:00:00`;
    }
  }

  get f1() {
    return this.step1Form.controls;
  }

  get f2() {
    return this.step2Form.controls;
  }

  /**
   * Load kecamatan dropdown list from bidang API
   */
  loadKecamatanList(): void {
    console.log('🔄 Starting to load kecamatan list...');
    this.isLoadingKecamatan = true;
    const kdProp = '35'; // Jawa Timur
    const kdDati2 = '08'; // Lumajang

    console.log('📡 Calling API: kecamatan-with-count/', kdProp, kdDati2);
    this.restApiService.getKecamatanWithCount(kdProp, kdDati2).subscribe({
      next: (response) => {
        console.log('✅ API Response received:', response);
        console.log('Response type:', typeof response);
        console.log('Response.success:', response?.success);
        console.log('Response.data:', response?.data);

        // Handle response - check if data exists in response or is the response itself
        const dataArray = response?.data || response;
        console.log('DataArray:', dataArray);
        console.log('DataArray is array?', Array.isArray(dataArray));

        if (dataArray && Array.isArray(dataArray) && dataArray.length > 0) {
          this.kecamatanList = dataArray.map((kec: any) => ({
            value: kec.nmKecamatan,
            label: kec.nmKecamatan,
            kdKec: kec.kdKecamatan
          }));
          console.log('✅ After mapping, kecamatanList:', this.kecamatanList);
          console.log('✅ kecamatanList.length:', this.kecamatanList.length);
          this.isLoadingKecamatan = false;
          console.log('✅ Kecamatan list loaded:', this.kecamatanList.length, 'items');
        } else {
          console.warn('⚠️ No valid data array found in response');
          this.isLoadingKecamatan = false;
        }
      },
      error: (error) => {
        console.error('❌ Error loading kecamatan list:', error);
        this.isLoadingKecamatan = false;
      }
    });
  }

  /**
   * Handle kecamatan selection change
   */
  onKecamatanChange(): void {
    const kecamatanName = this.step2Form.get('kecamatan')?.value;
    const selectedKec = this.kecamatanList.find(k => k.value === kecamatanName);

    if (selectedKec && selectedKec.kdKec) {
      this.selectedKdKec = selectedKec.kdKec;
      this.loadKelurahanList(selectedKec.kdKec);
      // Reset kelurahan selection
      this.step2Form.patchValue({ kelurahan: '' });
    } else {
      this.kelurahanList = [];
    }
  }

  /**
   * Load kelurahan dropdown list based on selected kecamatan
   */
  loadKelurahanList(kdKec: string): void {
    console.log('🔄 Starting to load kelurahan list for kd_kec:', kdKec);
    this.isLoadingKelurahan = true;
    const kdProp = '35'; // Jawa Timur
    const kdDati2 = '08'; // Lumajang

    this.restApiService.getKelurahanWithCount(kdProp, kdDati2, kdKec).subscribe({
      next: (response) => {
        console.log('✅ Kelurahan API Response received:', response);

        // Handle response - check if data exists in response or is the response itself
        const dataArray = response?.data || response;
        console.log('Kelurahan DataArray:', dataArray);

        if (dataArray && Array.isArray(dataArray) && dataArray.length > 0) {
          this.kelurahanList = dataArray.map((kel: any) => ({
            value: kel.nmKelurahan,
            label: kel.nmKelurahan
          }));
          this.isLoadingKelurahan = false;
          console.log('✅ Kelurahan list loaded:', this.kelurahanList.length, 'items');
        } else {
          console.warn('⚠️ No valid kelurahan data array found');
          this.kelurahanList = [];
          this.isLoadingKelurahan = false;
        }
      },
      error: (error) => {
        console.error('❌ Error loading kelurahan list:', error);
        this.isLoadingKelurahan = false;
        this.kelurahanList = [];
      }
    });
  }

  // ============ IMAGE UPLOAD METHODS ============

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Handle drop event
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(files);
    }
  }

  /**
   * Handle file input change
   */
  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(input.files);
      input.value = ''; // Reset input so same file can be selected again
    }
  }

  /**
   * Process selected files
   */
  handleFiles(files: FileList): void {
    const remainingSlots = this.maxImages - this.uploadedImages.length;
    if (remainingSlots <= 0) {
      alert(`Maksimal ${this.maxImages} gambar!`);
      return;
    }

    const filesToProcess = Math.min(files.length, remainingSlots);

    for (let i = 0; i < filesToProcess; i++) {
      const file = files[i];

      // Validate file type
      if (!this.allowedTypes.includes(file.type)) {
        alert(`File "${file.name}" bukan gambar yang valid. Gunakan JPG, PNG, GIF, atau WebP.`);
        continue;
      }

      // Create preview
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.uploadedImages.push({
          file: file,
          url: e.target?.result as string,
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }

    if (files.length > remainingSlots) {
      alert(`Hanya ${filesToProcess} gambar yang ditambahkan. Maksimal ${this.maxImages} gambar.`);
    }
  }

  /**
   * Remove uploaded image
   */
  removeImage(index: number): void {
    this.uploadedImages.splice(index, 1);
  }

  /**
   * Get remaining upload slots
   */
  getRemainingSlots(): number {
    return this.maxImages - this.uploadedImages.length;
  }
}
