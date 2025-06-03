import { Injectable, OnModuleInit } from '@nestjs/common';
import { pool } from '../config/database.config';
import { MedicalRecord } from './medical-record.interface';

@Injectable()
export class MedicalRecordsService implements OnModuleInit {
  async onModuleInit() {
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'medical_records'
        );
      `);

      let shouldRecreateTable = true;

      if (shouldRecreateTable) {
        await pool.query('DROP TABLE IF EXISTS medical_records CASCADE');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS medical_records (
            id SERIAL PRIMARY KEY,
            patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            bp_at_goal BOOLEAN DEFAULT FALSE,
            hospital_visit_since_last_review BOOLEAN DEFAULT FALSE,
            a1c_at_goal BOOLEAN DEFAULT FALSE,
            benzodiazepines BOOLEAN DEFAULT FALSE,
            antipsychotics BOOLEAN DEFAULT FALSE,
            opioids BOOLEAN DEFAULT FALSE,
            fall_since_last_visit BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      }
    } catch (error) {
      throw new Error(`Error checking/creating medical_records table: ${error.message}`);
    }
  }

  async createMedicalRecord(medicalRecord: MedicalRecord): Promise<MedicalRecord> {
    try {
      const result = await pool.query(
        `INSERT INTO medical_records (
          patient_id, bp_at_goal, hospital_visit_since_last_review,
          a1c_at_goal, benzodiazepines, antipsychotics, opioids, fall_since_last_visit
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          medicalRecord.patientId,
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

  private mapToMedicalRecord(row: any): MedicalRecord {
    return {
      id: row.id,
      patientId: row.patient_id,
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