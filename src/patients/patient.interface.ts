export interface Patient {
    id?: number;
    first_name: string;
    last_name: string;
    birthdate: string | Date;
    gender: 'M' | 'F' | 'O';
    phone_number?: string;
    contact_name?: string;
    contact_phone_number?: string;
    insurance?: string;
    site_name: string;
    building?: string;
    is_active: boolean;
    created_at?: Date;
    notes?: string;
}