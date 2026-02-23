export interface DocumentInfo {
  id: number;
  commercial_name: string;
  company_name: string;
  date: string;
  time_start: string;
  time_end: string;
  address: string;
  is_active: number;
}

export interface Employee {
  id: number;
  document_id: number;
  name: string;
  role: string;
  brigade: string;
  signature: string;
}
