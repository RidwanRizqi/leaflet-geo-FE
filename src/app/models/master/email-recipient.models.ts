export interface MasterEmailRecipient {
  id: number;
  employee_code: string;
  recipient_type: 'to' | 'cc' | 'bcc';
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
  deleted_at?: string | null;
  // Additional fields from server response
  employee_name?: string;
  email?: string;
  department?: string;
  position?: string;
}

export interface CreateEmailRecipientRequest {
  employee_code: string;
  recipient_type: 'to' | 'cc' | 'bcc';
}

export interface UpdateEmailRecipientRequest {
  employee_code?: string;
  recipient_type?: 'to' | 'cc' | 'bcc';
}
