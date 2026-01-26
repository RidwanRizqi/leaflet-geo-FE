// Organization and Lookup Models

// Lookup Models
export interface LookupEmployee {
  id: number;
  employee_code: string;
  name: string;
  division?: string;
  department?: string;
  position?: string;
  is_active?: boolean;
}

export interface LookupDivision {
  id: number;
  name: string;
  code?: string;
  is_active?: boolean;
}

export interface LookupDepartment {
  id: number;
  name: string;
  code?: string;
  division_id?: number;
  division_name?: string;
  is_active?: boolean;
}

export interface LookupGrade {
  id: number;
  name: string;
  code?: string;
  level?: number;
  is_active?: boolean;
}

// Main Organization Model
export interface OrganizationRecord {
  id: number;
  employee_code: string;
  supervisor_code: string;
  division_id: number;
  department_id: number;
  grade_id: number;
  line_id: number;
  section_id: number;
  group_id: number;
  sub_section_id: number;
  is_shift: boolean;
  is_intern: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;

  // Lookup relations (for display)
  employee?: LookupEmployee;
  supervisor?: LookupEmployee;
  division?: LookupDivision;
  department?: LookupDepartment;
  grade?: LookupGrade;
  line?: {
    id: number;
    name: string;
  };
  section?: {
    id: number;
    name: string;
  };
  group?: {
    id: number;
    name: string;
  };
  sub_section?: {
    id: number;
    name: string;
  };
}

// Create/Update Request
export interface CreateOrganizationRequest {
  employee_code: string;
  supervisor_code: string;
  division_id: number;
  department_id: number;
  grade_id: number;
  line_id: number;
  section_id: number;
  group_id: number;
  sub_section_id: number;
  is_shift: boolean;
  is_intern: boolean;
}

// Historical Response
export interface OrganizationHistoryResponse {
  employee_code: string;
  history: OrganizationRecord[];
  current_record: OrganizationRecord | null;
  total_records: number;
}

// Update Response
export interface OrganizationUpdateResponse {
  message: string;
  organization: OrganizationRecord;
  previous_record_id?: number;
}

// Search/Filter Parameters
export interface OrganizationSearchParams {
  search?: string;
  employee_code?: string;
  division_id?: number;
  department_id?: number;
  grade_id?: number;
  line_id?: number;
  section_id?: number;
  group_id?: number;
  sub_section_id?: number;
  is_shift?: boolean;
  is_intern?: boolean;
  is_active?: boolean;
  supervisor_code?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

// Employee Search Parameters for lookup
export interface EmployeeSearchParams {
  search?: string;
  division_id?: number;
  department_id?: number;
  is_active?: boolean;
  page?: number;
  limit?: number;
}


