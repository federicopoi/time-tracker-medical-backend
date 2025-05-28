import { Injectable, OnModuleInit } from '@nestjs/common';
import { pool } from '../config/database.config';

export interface Patient {
  id?: number;
  first_name: string;
  last_name: string;
  birthdate: Date | string;
  gender: 'M' | 'F' | 'O';
  phone_number?: string;
  contact_name?: string;
  contact_phone_number?: string;
  insurance?: string;
  is_active: boolean;
  site_name: string;
  building?: string;
  created_at?: Date;
  medical_records_completed?: boolean;
  bp_at_goal?: boolean;
  hospital_visited_since_last_review?: boolean;
  a1c_at_goal?: boolean;
  use_benzo?: boolean;
  fall_since_last_visit?: boolean;
  use_antipsychotic?: boolean;
  use_opioids?: boolean;
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

      let shouldRecreateTable = false;

      if (tableCheck.rows[0].exists) {
        // Check if the table has the old constraint
        const constraintCheck = await pool.query(`
          SELECT constraint_name 
          FROM information_schema.check_constraints 
          WHERE constraint_name LIKE '%site_name%' 
          AND constraint_schema = 'public'
        `);
        
        if (constraintCheck.rows.length > 0) {
          console.log('Found old site_name constraint, dropping and recreating table...');
          await pool.query('DROP TABLE IF EXISTS patients CASCADE');
          shouldRecreateTable = true;
        }
      }

      if (!tableCheck.rows[0].exists || shouldRecreateTable) {
        console.log('Creating patients table...');
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
            site_name VARCHAR(100) NOT NULL,
            building VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            medical_records_completed BOOLEAN,
            bp_at_goal BOOLEAN,
            hospital_visited_since_last_review BOOLEAN,
            a1c_at_goal BOOLEAN,
            use_benzo BOOLEAN,
            fall_since_last_visit BOOLEAN,
            use_antipsychotic BOOLEAN,
            use_opioids BOOLEAN
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
      
      // Convert birthdate string to Date if needed
      const birthdate = typeof patient.birthdate === 'string' ? new Date(patient.birthdate) : patient.birthdate;
      
      const result = await pool.query(
        `INSERT INTO patients (
          first_name, last_name, birthdate, gender, phone_number,
          contact_name, contact_phone_number, insurance, is_active, site_name, building
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
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
          patient.site_name,
          patient.building,
        ]
      );
      console.log('Patient created successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating patient:', error);
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
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
      console.error('Error updating patient:', error);
      throw error;
    }
  }

  async deletePatient(id: number): Promise<void> {
    await pool.query('DELETE FROM patients WHERE id = $1', [id]);
  }
}
