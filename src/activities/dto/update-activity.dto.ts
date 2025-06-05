export class UpdateActivityDto {
    patient_id?: number;
    user_id?: number;
    activity_type?: string;
    pharm_flag?: boolean;
    notes?: string;
    building?: string;
    site_name?: string;
    service_datetime?: Date | string;
    duration_minutes?: number;
} 