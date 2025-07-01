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

  async getPatients(): Promise<Patient[]> {
    const result = await pool.query('SELECT * FROM patients ORDER BY created_at DESC');
    return result.rows;
  }

  async getPatientsByUserAccess(userId: number): Promise<Patient[]> {
    try {
      // Get user's assigned sites
      const userResult = await pool.query(
        `SELECT primarysite_id, assignedsites_ids FROM users WHERE id = $1`,
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const user = userResult.rows[0];
      const assignedSiteIds = [user.primarysite_id, ...(user.assignedsites_ids || [])];
      
      // Get site names for the assigned site IDs
      const siteNamesResult = await pool.query(
        `SELECT name FROM sites WHERE id = ANY($1)`,
        [assignedSiteIds]
      );
      
      const siteNames = siteNamesResult.rows.map(row => row.name);
      
      if (siteNames.length === 0) {
        return []; // User has no assigned sites
      }
      
      // Get patients from assigned sites
      const result = await pool.query(
        `SELECT * FROM patients WHERE site_name = ANY($1) ORDER BY created_at DESC`,
        [siteNames]
      );
      
      return result.rows;
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
      // Get user's assigned sites
      const userResult = await pool.query(
        `SELECT primarysite_id, assignedsites_ids FROM users WHERE id = $1`,
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const user = userResult.rows[0];
      const assignedSiteIds = [user.primarysite_id, ...(user.assignedsites_ids || [])];
      
      // Get site names for the assigned site IDs
      const siteNamesResult = await pool.query(
        `SELECT name FROM sites WHERE id = ANY($1)`,
        [assignedSiteIds]
      );
      
      const userSiteNames = siteNamesResult.rows.map(row => row.name);
      
      if (userSiteNames.length === 0) {
        return null; // User has no assigned sites
      }
      
      // Get patient and check if user has access to the patient's site
      const result = await pool.query(
        `SELECT * FROM patients WHERE id = $1 AND site_name = ANY($2)`,
        [id, userSiteNames]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to fetch patient with access check: ${error.message}`);
    }
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

  async updatePatientWithAccessCheck(id: number, patient: Partial<Patient>, userId: number): Promise<Patient | null> {
    try {
      // First check if user has access to this patient
      const existingPatient = await this.getPatientByIdWithAccessCheck(id, userId);
      if (!existingPatient) {
        return null;
      }

      // Then update the patient
      return await this.updatePatient(id, patient);
    } catch (error) {
      throw new Error(`Failed to update patient with access check: ${error.message}`);
    }
  }

  async deletePatient(id: number): Promise<void> {
    await pool.query('DELETE FROM patients WHERE id = $1', [id]);
  }

  async deletePatientWithAccessCheck(id: number, userId: number): Promise<boolean> {
    try {
      // First check if user has access to this patient
      const existingPatient = await this.getPatientByIdWithAccessCheck(id, userId);
      if (!existingPatient) {
        return false;
      }

      // Then delete the patient
      await this.deletePatient(id);
      return true;
    } catch (error) {
      throw new Error(`Failed to delete patient with access check: ${error.message}`);
    }
  }

  async getPatientsBySiteName(siteName: string): Promise<Patient[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM patients WHERE site_name = $1 ORDER BY created_at DESC',
        [siteName]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch patients for site ${siteName}: ${error.message}`);
    }
  }

  async getPatientsBySiteNameWithAccessCheck(siteName: string, userId: number): Promise<Patient[]> {
    try {
      // Get user's assigned sites
      const userResult = await pool.query(
        `SELECT primarysite_id, assignedsites_ids FROM users WHERE id = $1`,
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const user = userResult.rows[0];
      const assignedSiteIds = [user.primarysite_id, ...(user.assignedsites_ids || [])];
      
      // Get site names for the assigned site IDs
      const siteNamesResult = await pool.query(
        `SELECT name FROM sites WHERE id = ANY($1)`,
        [assignedSiteIds]
      );
      
      const userSiteNames = siteNamesResult.rows.map(row => row.name);
      
      // Check if user has access to the requested site
      if (!userSiteNames.includes(siteName)) {
        return []; // User doesn't have access to this site
      }
      
      // Get patients from the site
      return await this.getPatientsBySiteName(siteName);
    } catch (error) {
      throw new Error(`Failed to fetch patients for site with access check: ${error.message}`);
    }
  }
}
