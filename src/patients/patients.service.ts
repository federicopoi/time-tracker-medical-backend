import { Injectable, OnModuleInit } from '@nestjs/common';
import { pool } from '../config/database.config';
import { Patient } from './patient.interface';

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

      let shouldRecreateTable = true; // We want to recreate the table to match new structure

      if (shouldRecreateTable) {
        await pool.query('DROP TABLE IF EXISTS patients CASCADE');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS patients (
            id SERIAL PRIMARY KEY,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            birthdate DATE NOT NULL,
            gender CHAR(1) CHECK (gender IN ('M', 'F', 'O')),
            phone_number VARCHAR(20),
            contact_name VARCHAR(100),
            contact_phone_number VARCHAR(20),
            insurance VARCHAR(100),
            is_active BOOLEAN DEFAULT TRUE,
            site VARCHAR(100) NOT NULL,
            building VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            medical_records VARCHAR(100) NOT NULL
          );
        `);
      }
    } catch (error) {
      throw new Error(`Error checking/creating patients table: ${error.message}`);
    }
  }

  async createPatient(patient: Patient): Promise<Patient> {
    try {
      // Convert birthdate string to Date if needed
      const birthdate = typeof patient.birthdate === 'string' ? new Date(patient.birthdate) : patient.birthdate;
      
      const result = await pool.query(
        `INSERT INTO patients (
          first_name, last_name, birthdate, gender, phone_number,
          contact_name, contact_phone_number, insurance, is_active, site, building,
          medical_records
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          patient.first_name,
          patient.last_name,
          birthdate,
          patient.gender,
          patient.phone_number,
          patient.contact_name,
          patient.contact_phone_number,
          patient.insurance,
          patient.is_active,
          patient.site,
          patient.building,
          patient.medical_records,
        ]
      );
      return result.rows[0];
    } catch (error) {
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
    try {
      const currentPatient = await this.getPatientById(id);
      if (!currentPatient) {
        throw new Error('Patient not found');
      }

      const fields = Object.keys(patient).filter(key => patient[key] !== undefined);
      const values = fields.map(field => patient[field]);
      
      const setString = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      
      const query = `
        UPDATE patients 
        SET ${setString} 
        WHERE id = $${fields.length + 1} 
        RETURNING *
      `;
      
      const result = await pool.query(query, [...values, id]);
      
      if (result.rows.length === 0) {
        throw new Error('Failed to update patient');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async deletePatient(id: number): Promise<void> {
    await pool.query('DELETE FROM patients WHERE id = $1', [id]);
  }
}
