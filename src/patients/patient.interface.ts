export interface Patient {
    id?: number;
    first_name: string;
    last_name: string;
    birthdate: Date | string;
    gender: 'M' | 'F' | 'O';
    phone_number?: string;
    contact_name?: string;
    contact_phone_number?: string;
    insurance?: string;
    is_active: boolean;
    site: string; // site ID
    site_name?: string;  // Added field for joined site name
    building?: string; // building ID
    building_name?: string;  // Added field for joined building name
    created_at?: Date;
    medical_records: string; // medical records ID
}