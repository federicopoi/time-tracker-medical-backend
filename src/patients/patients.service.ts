import { Injectable, OnModuleInit } from '@nestjs/common';
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
export class PatientsService implements OnModuleInit {
  async onModuleInit() {
    try {
      // Check if table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'patients'
        );
      `);
      console.log('Patients table exists:', tableCheck.rows[0].exists);

      if (!tableCheck.rows[0].exists) {
        console.log('Creating patients table...');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS patients (
            id SERIAL PRIMARY KEY,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            birthdate DATE NOT NULL,
            gender CHAR(1) CHECK (gender IN ('M', 'F')),
            phone_number VARCHAR(20),
            contact_name VARCHAR(100),
            contact_phone_number VARCHAR(20),
            insurance VARCHAR(100),
            is_active BOOLEAN DEFAULT TRUE,
            site_name VARCHAR(100) CHECK (site_name IN ('CP Greater San Antonio', 'CP Intermountain')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('Patients table created successfully');
      }
    } catch (error) {
      console.error('Error checking/creating patients table:', error);
    }
  }

  async createPatient(patient: Patient): Promise<Patient> {
    try {
      console.log('Attempting to create patient with data:', patient);
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
      console.log('Patient created successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating patient:', error);
      throw new Error(`Failed to create patient: ${error.message}`);
    }
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
