export interface MenuItem {
  name: string;
  price: number;
  category: 'FOOD' | 'BEVERAGE';
}

export interface Assessment {
  id?: number;
  businessId: string;
  businessName: string;
  assessmentDate: string;
  buildingArea?: number;
  seatingCapacity: number;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  businessType?: string;
  paymentMethods?: string[];

  // Menu Based Method
  menuItems?: MenuItem[];
  openingDaysPerMonth?: number;

  // Calculation results
  dailyRevenueWeekday?: number;
  dailyRevenueWeekend?: number;
  monthlyRevenueRaw?: number;
  monthlyRevenueAdjusted?: number;
  monthlyPbjt?: number;
  annualPbjt?: number;

  // Menu Based Results
  monthlyRevenueMenuBased?: number;
  monthlyPbjtMenuBased?: number;
  annualPbjtMenuBased?: number;

  // Adjustment factors
  adjustments?: AdjustmentDetails;

  // Confidence scoring
  confidence?: ConfidenceDetails;

  // Location
  location?: LocationDetails;

  // Observations
  observations: Observation[];

  // Audit trail
  surveyorId: string;
  verifiedBy?: string;
  taxpayerSigned?: boolean;

  // Supporting documents
  photoUrls?: string[];
  supportingDocUrl?: string;

  // Validation data
  validationData?: any;

  // Realization History
  realisasiHistory?: RealisasiHistoryItem[];

  // Tax configuration
  taxRate?: number;
  inflationRate?: number;
  operationalRate?: number;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface RealisasiHistoryItem {
  tahun: number;
  realisasiAmount: number;
  jumlahTransaksi: number;
}

// Sample Transaction with notes
export interface SampleTransaction {
  amount: number;
  notes?: string;
}

export interface Observation {
  id?: number;
  observationDate: string;
  dayType: string;
  visitors: number;
  durationHours: number;
  sampleTransactions: SampleTransaction[];
  notes?: string;
  visitorsPerHour?: number;
  avgTransaction?: number;
}

export interface AdjustmentDetails {
  businessType?: string;
  businessTypeCoefficient?: number;
  locationScore?: number;
  operationalRate?: number;
  taxRate?: number;
  inflationRate?: number;
}

export interface ConfidenceDetails {
  score?: number;
  level?: string;
  breakdown?: {
    data_completeness?: number;
    validation_sources?: number;
    survey_quality?: number;
  };
  recommendation?: string;
}

export interface LocationDetails {
  latitude: number;
  longitude: number;
  address: string;
  kelurahan?: string;
  kecamatan?: string;
  kabupaten?: string;
  // Advanced Factors
  roadType?: string;
  nearSchool?: boolean;
  nearOffice?: boolean;
  nearMarket?: boolean;
}

export interface AssessmentListResponse {
  data: Assessment[];
  pagination: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  success: boolean;
  message: string;
}

export interface AssessmentDetailResponse {
  data: Assessment;
  success: boolean;
  message: string;
}

export interface AssessmentRequest {
  businessId: string;
  businessName: string;
  businessType: string;
  seatingCapacity: number;
  buildingArea?: number;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  assessmentDate: string;
  // Location - flat structure (not nested)
  latitude: number;
  longitude: number;
  address: string;
  kelurahan?: string;
  kecamatan?: string;
  kabupaten?: string;
  // Advanced Factors
  roadType?: string;
  nearSchool?: boolean;
  nearOffice?: boolean;
  nearMarket?: boolean;
    // Menu Based Method
  menuItems?: MenuItem[];
  openingDaysPerMonth?: number;
  // Observations with sampleTransactions
  observations: ObservationRequest[];
  // Surveyor info (required by backend)
  surveyorId: string;
  verifiedBy?: string;
  taxpayerSigned?: boolean;
  // Photo URLs from uploaded images
  photoUrls?: string[];
  supportingDocUrl?: string;
  // Optional validation data
  validationData?: any;
  // Tax configuration (optional)
  taxRate?: number;
  inflationRate?: number;
  operationalRate?: number;
}

export interface ObservationRequest {
  observationDate: string;
  dayType: string;
  visitors: number;
  durationHours: number;
  sampleTransactions: SampleTransaction[];  // Required: 5-30 transaction objects
  notes?: string;
}

export const DayType = {
  WEEKDAY_PEAK: 'WEEKDAY_PEAK',
  WEEKDAY_OFFPEAK: 'WEEKDAY_OFFPEAK',
  WEEKEND_PEAK: 'WEEKEND_PEAK',
  HOLIDAY: 'HOLIDAY'
};

export const BusinessType = {
  WARUNG_KECIL: 'WARUNG_KECIL',
  RUMAH_MAKAN: 'RUMAH_MAKAN',
  RESTAURANT: 'RESTAURANT',
  CAFE_MODERN: 'CAFE_MODERN',
  FRANCHISE: 'FRANCHISE'
};

export const ConfidenceLevel = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
};
