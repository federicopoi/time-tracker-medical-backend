export class CreatePatientDto {
    first_name: string;
    last_name: string;
    birthdate: string; // format: 'YYYY-MM-DD'
    gender: 'M' | 'F';
    phone_number?: string;
    contact_name?: string;
    contact_phone_number?: string;
    insurance?: string;
    site_name: string;
    building?: string;
  }
  