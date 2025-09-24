export interface MasterEmployment {
  employee_code: string;
  employee_name: string;
  profile_pic: string | null;
  job_grade_code: string;
  deparment_id: number;
  grade_id: number;
  label: string;
}

export interface MasterDivision {
  id: number;
  division_code: string;
  division_desc: string;
  label: string;
}

export interface MasterDepartment {
  department_code: string;
  department_name: string;
  division_id: number;
  label: string;
}

export interface MasterGrade {
  id: number;
  grade_code: string;
  is_presdir: boolean | null;
  is_bod: boolean | null;
  is_active: boolean | null;
  is_deleted: boolean | null;
  level: string;
  weight_objective_score: number | null;
  weight_core_value_score: number | null;
}

export interface MasterSection {
  id: number;
  section: string;
  id_area: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  deleted_at: string | null;
}

export interface MasterSubSectionOld {
  id: number;
  sub_section: string;
  id_section: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  deleted_at: string | null;
}

export interface PagingModel {
  page: number;
  page_size: number;
  total_item: number;
  total_page: number;
}

export interface MasterOrganization {
  id: number;
  employee_code: string;
  employee_name?: string;
  profile_pic?: string;
  division: string;
  division_name: string;
  department: string;
  department_name: string;
  grade: string;
  grade_level?: string;
  grade_code?: string;
  linesection: string;
  section_name?: string;
  subsection: string;
  subsection_name?: string;
}

export interface MasterArea {
  id: number;
  lineprod: string;
  is_active: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  deleted_at: string | null;
}

// Note: New master data models have been moved to src/app/core/models/master/
// This keeps the original models for existing functionality (organization-list, etc.)
