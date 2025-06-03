export interface MedicalRecord {
  id?: number;
  patientId: number;
  medicalRecords: boolean;
  bpAtGoal: boolean;
  hospitalVisitSinceLastReview: boolean;
  a1cAtGoal: boolean;
  benzodiazepines: boolean;
  antipsychotics: boolean;
  opioids: boolean;
  fallSinceLastVisit: boolean;
  createdAt?: Date;
} 