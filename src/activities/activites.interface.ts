export interface Activity {
    id?:number;
    patient_id:number;
    user_id:number;
    activity_type:string;
    pharm_flag?:boolean;
    notes?:string;
    building?:string; // building id
    site_name:string; // site id
    service_datetime:Date;
    duration_minutes:number;
    created_at?:Date;
}