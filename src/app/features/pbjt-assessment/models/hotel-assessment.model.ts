/**
 * Hotel Assessment Models
 * Assessment and projection models for hotel accommodation type
 * Adapted from UPDATE folder reference
 */

import { AccommodationType } from './accommodation.model';

export interface HotelAssessmentRequest {
  accommodationType: AccommodationType;
  propertyData: any;
  assessmentDate: Date;
  surveyorId: string;
  photos?: File[];
  documents?: File[];
}

export interface HotelAssessmentResponse {
  id: string;
  propertyId: string;
  accommodationType: AccommodationType;
  assessmentDate: Date;
  revenueEstimate: {
    method: string;
    annualRevenue: number;
    monthlyBreakdown?: number[];
    confidence: number;
  };
  taxProjection: {
    taxRate: number;
    annualTax: number;
    fiveYearTotal: number;
  };
  marketAnalysis: {
    competitionLevel: 'low' | 'medium' | 'high';
    locationScore: number;
    marketSegment: string;
  };
  recommendations: string[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdAt: Date;
}

export interface DashboardMetrics {
  totalProperties: number;
  byType: {
    [key in AccommodationType]: number;
  };
  revenue: {
    current: number;
    projected: number;
    potential: number;
    growth: number;
  };
  tax: {
    potential: number;
    collected: number;
    projected: number;
    gap: number;
    collectionRate: number;
  };
  formalization: {
    formal: number;
    informal: number;
    rate: number;
  };
  recentAssessments: number;
  pendingApprovals: number;
  trends: {
    labels: string[];
    revenue: number[];
    tax: number[];
  };
}
