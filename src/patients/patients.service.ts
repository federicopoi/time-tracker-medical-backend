import { Injectable } from '@nestjs/common';
import { pool } from '../config/database.config';
import { Patient } from './patient.interface';

@Injectable()
export class PatientsService {
  async createPatient(patient: Patient): Promise<Patient> {
    try {
      // Convert birthdate string to Date if needed
      const birthdate = typeof patient.birthdate === 'string' ? new Date(patient.birthdate) : patient.birthdate;
      
      const result = await pool.query(
        `INSERT INTO patients (
          first_name, last_name, birthdate, gender, phone_number,
          contact_name, contact_phone_number, insurance, is_active, site_name, building,
          notes
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
          patient.site_name,
          patient.building,
          patient.notes
        ]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create patient: ${error.message}`);
    }
  }

  async getPatients(limit?: number, offset?: number): Promise<{ patients: Patient[], total: number }> {
    try {
      // Get total count
      const countResult = await pool.query('SELECT COUNT(*) FROM patients');
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated results
      let query = 'SELECT * FROM patients ORDER BY created_at DESC';
      const params: any[] = [];
      
      if (limit !== undefined && offset !== undefined) {
        query += ' LIMIT $1 OFFSET $2';
        params.push(limit, offset);
      }
      
      const result = await pool.query(query, params);
      return { patients: result.rows, total };
    } catch (error) {
      throw new Error(`Failed to fetch patients: ${error.message}`);
    }
  }

  async getPatientsByUserAccess(userId: number, limit?: number, offset?: number): Promise<{ patients: Patient[], total: number }> {
    try {
      // Get total count
      const countResult = await pool.query(
        `
        SELECT COUNT(*) 
        FROM patients p
        LEFT JOIN sites s ON p.site_id = s.id
        WHERE EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = $1
          AND (
            p.site_id = u.primarysite_id
            OR p.site_id = ANY(u.assignedsites_ids)
          )
        )
      `,
        [userId]
      );
      const total = parseInt(countResult.rows[0].count);
      
      // Get paginated results
      let query = `
        SELECT p.*, s.name as site_name
        FROM patients p
        LEFT JOIN sites s ON p.site_id = s.id
        WHERE EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = $1
          AND (
            p.site_id = u.primarysite_id
            OR p.site_id = ANY(u.assignedsites_ids)
          )
        )
        ORDER BY p.created_at DESC
      `;
      
      const params: any[] = [userId];
      
      if (limit !== undefined && offset !== undefined) {
        query += ' LIMIT $2 OFFSET $3';
        params.push(limit, offset);
      }
      
      const result = await pool.query(query, params);
      return { patients: result.rows, total };
    } catch (error) {
      throw new Error(`Failed to fetch patients for user access: ${error.message}`);
    }
  }

  async getPatientById(id: number): Promise<Patient> {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    return result.rows[0];
  }

  async getPatientByIdWithAccessCheck(id: number, userId: number): Promise<Patient | null> {
    try {
      const result = await pool.query(
        `
        SELECT p.*, s.name as site_name
        FROM patients p
        LEFT JOIN sites s ON p.site_id = s.id
        WHERE p.id = $1
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = $2
          AND (
            p.site_id = u.primarysite_id
            OR p.site_id = ANY(u.assignedsites_ids)
          )
        )
      `,
        [id, userId]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to fetch patient with access check: ${error.message}`);
    }
  }

  async updatePatient(id: number, patient: Partial<Patient>): Promise<Patient> {
    try {
      const fields = Object.keys(patient).filter(key => patient[key] !== undefined);
      const values = fields.map(field => patient[field]);
      
      if (fields.length === 0) {
        throw new Error('No fields to update');
      }
      
      const setString = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      
      const query = `
        UPDATE patients 
        SET ${setString} 
        WHERE id = $${fields.length + 1} 
        RETURNING *
      `;
      
      const result = await pool.query(query, [...values, id]);
      
      if (result.rows.length === 0) {
        throw new Error('Patient not found');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async updatePatientWithAccessCheck(id: number, patient: Partial<Patient>, userId: number): Promise<Patient | null> {
    try {
      const fields = Object.keys(patient).filter(key => patient[key] !== undefined);
      const values = fields.map(field => patient[field]);
      
      if (fields.length === 0) {
        throw new Error('No fields to update');
      }
      
      const setString = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      
      const query = `
        UPDATE patients 
        SET ${setString} 
        WHERE id = $${fields.length + 1}
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = $${fields.length + 2}
          AND (
            patients.site_id = u.primarysite_id
            OR patients.site_id = ANY(u.assignedsites_ids)
          )
        )
        RETURNING *
      `;
      
      const result = await pool.query(query, [...values, id, userId]);
      
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to update patient with access check: ${error.message}`);
    }
  }

  async deletePatient(id: number): Promise<void> {
    await pool.query('DELETE FROM patients WHERE id = $1', [id]);
  }

  async deletePatientWithAccessCheck(id: number, userId: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `
        DELETE FROM patients 
        WHERE id = $1
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = $2
          AND (
            patients.site_id = u.primarysite_id
            OR patients.site_id = ANY(u.assignedsites_ids)
          )
        )
      `,
        [id, userId]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete patient with access check: ${error.message}`);
    }
  }

  async getPatientsBySiteName(siteName: string): Promise<Patient[]> {
    try {
      const result = await pool.query(
        `
        SELECT p.*, s.name as site_name
        FROM patients p
        LEFT JOIN sites s ON p.site_id = s.id
        WHERE s.name = $1
        ORDER BY p.created_at DESC
      `,
        [siteName]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch patients for site ${siteName}: ${error.message}`);
    }
  }

  async getPatientsBySiteNameWithAccessCheck(siteName: string, userId: number): Promise<Patient[]> {
    try {
      const result = await pool.query(
        `
        SELECT p.*, s.name as site_name
        FROM patients p
        LEFT JOIN sites s ON p.site_id = s.id
        WHERE s.name = $1
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = $2
          AND (
            p.site_id = u.primarysite_id
            OR p.site_id = ANY(u.assignedsites_ids)
          )
        )
        ORDER BY p.created_at DESC
      `,
        [siteName, userId]
      );
      
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch patients for site with access check: ${error.message}`);
    }
  }
}
