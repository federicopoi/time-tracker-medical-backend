export interface Activity {
  id?: number;
  patient_id: number;
  user_id: number;
  activity_type: string;
  pharm_flag?: boolean;
  notes?: string;
  building?: string;
  site_id?: number;  // Changed from site_name to site_id
  site_name?: string; // Keep for compatibility
  service_datetime: Date;
  service_endtime: Date;
  end_time?: Date; // Alias for service_endtime to match frontend
  duration_minutes: number; // Supports decimal values to account for seconds (e.g., 1.5 minutes = 1 minute 30 seconds)
  created_at?: Date;
}
