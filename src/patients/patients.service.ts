import { Injectable } from '@nestjs/common';
import { pool } from '../config/database.config';

export interface Patient {
  id?: number;
  first_name: string;
  last_name: string;
  birthdate: Date;
  gender: 'M' | 'F';
  phone_number?: string;
  contact_name?: string;
  contact_phone_number?: string;
  insurance?: string;
  is_active: boolean;
  site_name: 'CP Greater San Antonio' | 'CP Intermountain';
}

@Injectable()
export class PatientsService {
  async createPatient(patient: Patient): Promise<Patient> {
    const result = await pool.query(
      `INSERT INTO patients (
        first_name, last_name, birthdate, gender, phone_number,
        contact_name, contact_phone_number, insurance, is_active, site_name
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        patient.first_name,
        patient.last_name,
        patient.birthdate,
        patient.gender,
        patient.phone_number,
        patient.contact_name,
        patient.contact_phone_number,
        patient.insurance,
        patient.is_active,
        patient.site_name,
      ]
    );
    return result.rows[0];
  }

  async getPatients(): Promise<Patient[]> {
    const result = await pool.query('SELECT * FROM patients ORDER BY created_at DESC');
    return result.rows;
  }

  async getPatientById(id: number): Promise<Patient> {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    return result.rows[0];
  }

  async updatePatient(id: number, patient: Partial<Patient>): Promise<Patient> {
    const fields = Object.keys(patient);
    const values = Object.values(patient);
    const setString = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    
    const result = await pool.query(
      `UPDATE patients SET ${setString} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  }

  async deletePatient(id: number): Promise<void> {
    await pool.query('DELETE FROM patients WHERE id = $1', [id]);
  }
}
