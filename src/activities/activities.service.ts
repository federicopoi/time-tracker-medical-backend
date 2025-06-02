import { Injectable, OnModuleInit } from '@nestjs/common';
import { pool } from '../config/database.config';

export interface Activity {
  id?: number;
  patient_id: number;
  user_id: number;
  activity_type: string;
  user_initials: string;
  pharm_flag?: boolean;
  notes?: string;
  site_name: string;
  building_name?: string;
  service_datetime: Date;
  duration_minutes: number;
}

@Injectable()
export class ActivitiesService implements OnModuleInit {
  async onModuleInit() {
    try {
      // Check if table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'activities'
        );
      `);

      let shouldRecreateTable = false;

      if (tableCheck.rows[0].exists) {
        // Check if the table has the old constraint
        const constraintCheck = await pool.query(`
          SELECT constraint_name 
          FROM information_schema.check_constraints 
          WHERE constraint_name LIKE '%site_name%' 
          AND constraint_schema = 'public'
        `);
        
        // Check if building_name column exists
        const columnCheck = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'activities'
            AND column_name = 'building_name'
          );
        `);
        
        if (constraintCheck.rows.length > 0 || !columnCheck.rows[0].exists) {
          await pool.query('DROP TABLE IF EXISTS activities CASCADE');
          shouldRecreateTable = true;
        }
      }

      if (!tableCheck.rows[0].exists || shouldRecreateTable) {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS activities (
            id SERIAL PRIMARY KEY,
            patient_id INT NOT NULL,
            user_id INT NOT NULL,
            activity_type VARCHAR(255) NOT NULL,
            user_initials VARCHAR(10) NOT NULL,
            pharm_flag BOOLEAN,
            notes TEXT,
            site_name VARCHAR(100) NOT NULL,
            building_name VARCHAR(100),
            service_datetime TIMESTAMP NOT NULL,
            duration_minutes DECIMAL(5,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_patient
              FOREIGN KEY (patient_id)
              REFERENCES patients(id)
              ON DELETE CASCADE,
            CONSTRAINT fk_user
              FOREIGN KEY (user_id)
              REFERENCES users(id)
              ON DELETE CASCADE
          );
        `);
      }
    } catch (error) {
      throw error;
    }
  }

  async createActivity(activity: Activity): Promise<Activity> {
    // First, get the user's initials based on user_id
    const userResult = await pool.query(
      'SELECT first_name, last_name FROM users WHERE id = $1',
      [activity.user_id]
    );
    
    let userInitials = '';
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      userInitials = (user.first_name?.charAt(0) || '') + (user.last_name?.charAt(0) || '');
    }

    // Get the patient's building information
    const patientResult = await pool.query(
      'SELECT building, site_name FROM patients WHERE id = $1',
      [activity.patient_id]
    );
    
    let buildingName = activity.building_name || '';
    let siteName = activity.site_name;
    
    if (patientResult.rows.length > 0) {
      const patient = patientResult.rows[0];
      // Use patient's building if activity doesn't have one or if it's empty
      if (!buildingName || buildingName.trim() === '') {
        buildingName = patient.building || '';
      }
      // Use patient's site_name if activity doesn't have one
      if (!siteName || siteName.trim() === '') {
        siteName = patient.site_name || '';
      }
    }
    
    const result = await pool.query(
      `INSERT INTO activities (
        patient_id, user_id, activity_type, user_initials, pharm_flag,
        notes, site_name, building_name, service_datetime, duration_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        activity.patient_id,
        activity.user_id,
        activity.activity_type,
        userInitials,
        activity.pharm_flag || false,
        activity.notes || '',
        siteName,
        buildingName,
        activity.service_datetime,
        activity.duration_minutes,
      ]
    );
    
    return result.rows[0];
  }

  async getActivities(): Promise<Activity[]> {
    try {
      const result = await pool.query('SELECT * FROM activities ORDER BY service_datetime DESC');
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getActivitiesWithDetails(): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          a.*,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          CONCAT(p.last_name, ', ', p.first_name) as patient_name,
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          s.name as site_name,
          b.name as building_name,
          b.id as building_id
        FROM activities a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN sites s ON a.site_name = s.name
        LEFT JOIN buildings b ON b.site_id = s.id
        ORDER BY a.service_datetime DESC
      `);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getActivityById(id: number): Promise<Activity> {
    try {
      const result = await pool.query(`
        SELECT 
          a.*,
          p.first_name as patient_first_name,
          p.last_name as patient_last_name,
          CONCAT(p.last_name, ', ', p.first_name) as patient_name,
          u.first_name as user_first_name,
          u.last_name as user_last_name
        FROM activities a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.id = $1
      `, [id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async getActivitiesByPatientId(patientId: number): Promise<Activity[]> {
    const result = await pool.query(
      `SELECT a.*, 
        u.first_name as user_first_name, 
        u.last_name as user_last_name
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.patient_id = $1 
      ORDER BY a.service_datetime DESC`,
      [patientId]
    );
    return result.rows;
  }

  async updateActivity(id: number, activity: Partial<Activity>): Promise<Activity> {
    const fields = Object.keys(activity);
    const values = Object.values(activity);
    const setString = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    
    const result = await pool.query(
      `UPDATE activities SET ${setString} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  }

  async deleteActivity(id: number): Promise<void> {
    await pool.query('DELETE FROM activities WHERE id = $1', [id]);
  }
} 