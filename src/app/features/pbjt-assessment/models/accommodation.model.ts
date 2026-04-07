/**
 * Accommodation Type Models
 * Multi-type property definitions for tax assessment system
 * Adapted from UPDATE folder reference
 */

export enum AccommodationType {
  HOTEL = 'HOTEL',
  WISMA = 'WISMA',
  HOMESTAY = 'HOMESTAY',
  PENGINAPAN = 'PENGINAPAN',
  RUMAH_KOS = 'RUMAH_KOS'
}

export enum FormalizationStatus {
  FORMAL = 'FORMAL',
  SEMI_FORMAL = 'SEMI_FORMAL',
  INFORMAL = 'INFORMAL'
}

export enum PropertyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  CLOSED = 'CLOSED'
}

export interface Accommodation {
  id: string;
  accommodationType: AccommodationType;
  propertyName: string;
  ownerName: string;
  ownerPhone: string;
  address: string;
  kelurahan?: string;
  kecamatan?: string;
  kabupaten?: string;
  latitude?: number;
  longitude?: number;
  totalRooms: number;
  buildingArea?: number;
  landArea?: number;
  hasBusinessPermit: boolean;
  hasTaxRegistration: boolean;
  formalizationStatus: FormalizationStatus;
  estimatedAnnualRevenue: number;
  projectedAnnualTax: number;
  willingToFormalize?: boolean | null;
  status: PropertyStatus;
  createdAt?: Date;
  updatedAt?: Date;
  photoUrls?: string[];
  supportingDocUrl?: string;
}

// Display metadata for accommodation types
export const AccommodationTypeMetadata: { [key: string]: { label: string; icon: string; color: string; riIcon: string; avgRooms: number; formalRate: number } } = {
  [AccommodationType.HOTEL]: {
    label: 'Hotel',
    icon: 'hotel',
    color: '#1976d2',
    riIcon: 'ri-hotel-line',
    avgRooms: 50,
    formalRate: 0.95
  },
  [AccommodationType.WISMA]: {
    label: 'Wisma/Guest House',
    icon: 'home_work',
    color: '#388e3c',
    riIcon: 'ri-home-4-line',
    avgRooms: 15,
    formalRate: 0.60
  },
  [AccommodationType.HOMESTAY]: {
    label: 'Homestay',
    icon: 'cottage',
    color: '#f57c00',
    riIcon: 'ri-home-heart-line',
    avgRooms: 3,
    formalRate: 0.30
  },
  [AccommodationType.PENGINAPAN]: {
    label: 'Penginapan',
    icon: 'bed',
    color: '#7b1fa2',
    riIcon: 'ri-hotel-bed-line',
    avgRooms: 18,
    formalRate: 0.40
  },
  [AccommodationType.RUMAH_KOS]: {
    label: 'Rumah Kos',
    icon: 'apartment',
    color: '#c62828',
    riIcon: 'ri-building-2-line',
    avgRooms: 15,
    formalRate: 0.20
  }
};
