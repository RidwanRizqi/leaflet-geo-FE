// Template Entity Model
export interface ITemplateEntity {
  id: number;
  name: string;
  description: string;
  status: TemplateEntityStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// Create Request Interface
export interface ICreateTemplateEntityRequest {
  name: string;
  description: string;
  status: TemplateEntityStatus;
}

// Update Request Interface
export interface IUpdateTemplateEntityRequest {
  name?: string;
  description?: string;
  status?: TemplateEntityStatus;
}

// Status Enum
export enum TemplateEntityStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft'
}

// Search/Filter Parameters
export interface ITemplateEntitySearchParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: TemplateEntityStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Generic API Response (shared across features)
export interface IApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  pagination?: IPagination;
}

export interface IPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// Form state interface
export interface ITemplateEntityFormState {
  isLoading: boolean;
  isEditing: boolean;
  entityId?: number;
}
