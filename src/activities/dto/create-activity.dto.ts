export class CreateActivityDto {
    patient_id:number;
    user_id:number;
    activity_type:string;
    pharm_flag?:boolean;
    notes?:string;
    building?:string;
    site_name:string;
    service_datetime:Date;
    duration_minutes:number;
}