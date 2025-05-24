import { Injectable } from '@nestjs/common';
import { pool } from '../config/database.config';

export interface Activity {
  id?: number;
  patient_id: number;
  user_id: number;
  activity_type: string;
  personnel_initials?: string;
  pharm_flag?: boolean;
  notes?: string;
  site_name: 'CP Greater San Antonio' | 'CP Intermountain';
  service_datetime: Date;
  duration_minutes: number;
}

@Injectable()
export class ActivitiesService {
  async createActivity(activity: Activity): Promise<Activity> {
    console.log('Creating activity with data:', activity);
    const result = await pool.query(
      `INSERT INTO activities (
        patient_id, user_id, activity_type, personnel_initials, pharm_flag,
        notes, site_name, service_datetime, duration_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        activity.patient_id,
        activity.user_id,
        activity.activity_type,
        activity.personnel_initials || '',
        activity.pharm_flag || false,
        activity.notes || '',
        activity.site_name,
        activity.service_datetime,
        activity.duration_minutes,
      ]
    );
    console.log('Created activity:', result.rows[0]);
    return result.rows[0];
  }

  async getActivities(): Promise<Activity[]> {
    const result = await pool.query('SELECT * FROM activities ORDER BY service_datetime DESC');
    return result.rows;
  }

  async getActivityById(id: number): Promise<Activity> {
    console.log('Fetching activity with id:', id);
    const result = await pool.query('SELECT * FROM activities WHERE id = $1', [id]);
    console.log('Fetched activity:', result.rows[0]);
    return result.rows[0];
  }

  async getActivitiesByPatientId(patientId: number): Promise<Activity[]> {
    const result = await pool.query(
      `SELECT a.*, 
        u.first_name as user_first_name, 
        u.last_name as user_last_name,
        CONCAT(u.first_name[1], u.last_name[1]) as user_initials
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