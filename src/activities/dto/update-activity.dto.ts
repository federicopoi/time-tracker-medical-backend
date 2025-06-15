export class UpdateActivityDto {
    patient_id?: number;
    user_id?: number;
    activity_type?: string;
    pharm_flag?: boolean;
    notes?: string;
    building?: string;
    site_name?: string;
    service_datetime?: Date | string;
    service_endtime?: Date | string;
    duration_minutes?: number; // Supports decimal values to account for seconds (e.g., 1.5 minutes = 1 minute 30 seconds)
} 