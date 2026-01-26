export interface MasterSectionHierarchy {
  id: number;
  name: string;
  parent_id?: number | null;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;
  parent_name?: string | null; // For display purposes - can be null
  children?: MasterSectionHierarchy[]; // For tree structure
}


