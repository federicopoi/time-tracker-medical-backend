import { Injectable } from '@nestjs/common';
import { pool } from '../config/database.config';
import { MedicalRecord } from './medical-record.interface';

@Injectable()
export class MedicalRecordsService {
  async createMedicalRecord(medicalRecord: MedicalRecord): Promise<MedicalRecord> {
    try {
      const result = await pool.query(
        `INSERT INTO medical_records (
          patient_id, medical_records, bp_at_goal, hospital_visit_since_last_review,
          a1c_at_goal, benzodiazepines, antipsychotics, opioids, fall_since_last_visit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          medicalRecord.patientId,
          medicalRecord.medical_records,
          medicalRecord.bpAtGoal,
          medicalRecord.hospitalVisitSinceLastReview,
          medicalRecord.a1cAtGoal,
          medicalRecord.benzodiazepines,
          medicalRecord.antipsychotics,
          medicalRecord.opioids,
          medicalRecord.fallSinceLastVisit
        ]
      );

      return this.mapToMedicalRecord(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to create medical record: ${error.message}`);
    }
  }

  async getMedicalRecordsByPatientId(patientId: number): Promise<MedicalRecord[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM medical_records WHERE patient_id = $1 ORDER BY created_at DESC',
        [patientId]
      );

      return result.rows.map(row => this.mapToMedicalRecord(row));
    } catch (error) {
      throw new Error(`Failed to get medical records: ${error.message}`);
    }
  }

  async getLatestMedicalRecordByPatientId(patientId: number): Promise<MedicalRecord | null> {
    try {
      const result = await pool.query(
        'SELECT * FROM medical_records WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 1',
        [patientId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapToMedicalRecord(result.rows[0]);
    } catch (error) {
      throw new Error(`Failed to get latest medical record: ${error.message}`);
    }
  }

  private mapToMedicalRecord(row: any): MedicalRecord {
    return {
      id: row.id,
      patientId: row.patient_id,
      medical_records: row.medical_records,
      bpAtGoal: row.bp_at_goal,
      hospitalVisitSinceLastReview: row.hospital_visit_since_last_review,
      a1cAtGoal: row.a1c_at_goal,
      benzodiazepines: row.benzodiazepines,
      antipsychotics: row.antipsychotics,
      opioids: row.opioids,
      fallSinceLastVisit: row.fall_since_last_visit,
      createdAt: row.created_at
    };
  }
} 