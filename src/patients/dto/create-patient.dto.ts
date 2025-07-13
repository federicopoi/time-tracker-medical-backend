export class CreatePatientDto {
  first_name: string;
  last_name: string;
  birthdate: string; // format: 'YYYY-MM-DD'
  gender: "M" | "F" | "O";
  phone_number?: string;
  contact_name?: string;
  contact_phone_number?: string;
  insurance?: string;
  site_id?: number; // site ID
  site_name?: string; // site name for compatibility
  building?: string; // building ID
  is_active: boolean;
  notes?: string;
}
