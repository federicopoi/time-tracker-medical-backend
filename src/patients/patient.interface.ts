export interface Patient {
  id?: number;
  first_name: string;
  last_name: string;
  birthdate: string | Date;
  gender: "M" | "F" | "O";
  phone_number?: string;
  contact_name?: string;
  contact_phone_number?: string;
  insurance?: string;
  site_id?: number;  // Changed from site_name to site_id
  site_name?: string; // Keep for compatibility
  building?: string;
  is_active: boolean;
  created_at?: Date;
  notes?: string;
}
