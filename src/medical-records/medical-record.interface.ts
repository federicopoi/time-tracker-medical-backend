export interface MedicalRecord {
  id?: number;
  patientId: number;
  medical_records: boolean;
  bpAtGoal: boolean;
  hospitalVisitSinceLastReview: boolean;
  a1cAtGoal: boolean;
  benzodiazepines: boolean;
  antipsychotics: boolean;
  opioids: boolean;
  fallSinceLastVisit: boolean;
  createdAt?: Date;
}
