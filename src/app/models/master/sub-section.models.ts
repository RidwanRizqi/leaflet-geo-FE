export interface MasterManpower {
  id: number;
  sub_section_id: number;
  line_id: number;
  group_id: number;
  manpower_count: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;
  line?: {
    id: number;
    name: string;
  };
  group?: {
    id: number;
    name: string;
  };
}

export interface MasterSubSectionNew {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;
  manpowers?: MasterManpower[];
}

export interface CreateSubSectionRequest {
  name: string;
  manpowers?: {
    line_id: number;
    group_id: number;
    manpower_count: number;
  }[];
}
