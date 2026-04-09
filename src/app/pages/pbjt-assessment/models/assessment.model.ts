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

  // Calculation results
  dailyRevenueWeekday?: number;
  dailyRevenueWeekend?: number;
  monthlyRevenueRaw?: number;
  monthlyRevenueAdjusted?: number;
  monthlyPbjt?: number;
  annualPbjt?: number;

  // Adjustment factors
  adjustments?: AdjustmentDetails;

  // Confidence scoring
  confidence?: ConfidenceDetails;

  // Location
  location?: LocationDetails;

  // Location factors (juga di root level untuk edit mode)
  roadType?: string;
  nearSchool?: boolean;
  nearOffice?: boolean;
  nearMarket?: boolean;

  // Observations
  observations: Observation[];

  // Audit trail
  surveyorId: string;
  verifiedBy?: string;
  taxpayerSigned?: boolean;

  // Menu items
  menuItems?: MenuItem[];

  // Supporting documents
  photoUrls?: string[];
  supportingDocUrl?: string;

  // Validation data
  validationData?: any;

  // Tax configuration
  taxRate?: number;
  inflationRate?: number;
  operationalRate?: number;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// Menu Item
export interface MenuItem {
  name: string;
  price: number;
  category: string; // 'FOOD' | 'BEVERAGE'
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
  assignedUserId?: string;
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
  openingDaysPerMonth?: number;
  // Location - flat structure (not nested)
  latitude: number;
  longitude: number;
  address: string;
  kelurahan?: string;
  kecamatan?: string;
  kabupaten?: string;
  // Location factors
  roadType?: string;
  nearSchool?: boolean;
  nearOffice?: boolean;
  nearMarket?: boolean;
  // Menu items
  menuItems?: MenuItem[];
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
  assignedUserId?: string;
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
