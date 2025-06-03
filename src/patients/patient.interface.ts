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
    building?: string; // building ID
    created_at?: Date;
    medical_records: string; // medical records ID
}