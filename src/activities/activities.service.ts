import { Injectable } from '@nestjs/common';
import { pool } from '../config/database.config';
import { Activity } from './activites.interface';

@Injectable()
export class ActivitiesService {
  async createActivity(activity: Activity): Promise<Activity> {
    try {
      const result = await pool.query(
        `INSERT INTO activities (
          patient_id, user_id, activity_type, pharm_flag, notes, 
          site_name, building, service_datetime, duration_minutes
        ) 
        VALUES (
          $1, 
          $2, 
          $3, 
          $4, 
          $5, 
          COALESCE((SELECT site_name FROM patients WHERE id = $1), $6),
          COALESCE((SELECT building FROM patients WHERE id = $1), $7), 
          $8, 
          $9
        )
        RETURNING *`,
        [
          activity.patient_id,                                    // $1
          activity.user_id,                                       // $2
          activity.activity_type,                                 // $3
          activity.pharm_flag || false,                          // $4
          activity.notes || '',                                  // $5
          activity.site_name || '',                              // $6 (fallback site_name)
          activity.building || '',                               // $7 (fallback building)
          activity.service_datetime || new Date().toISOString(), // $8
          activity.duration_minutes                              // $9
        ]
      );
      
      if (result.rows.length === 0) {
        throw new Error('No activity was created - patient may not exist');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Database error in createActivity:', error);
      throw new Error(`Failed to create activity: ${error.message}`);
    }
  }

  async getActivites(): Promise<Activity[]>{
      const result = await pool.query(`
        SELECT 
          a.*,
          p.site_name,
          p.building,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name,
          CONCAT(
            UPPER(LEFT(u.first_name, 1)),
            UPPER(LEFT(u.last_name, 1))
          ) as user_initials
        FROM activities a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
      `);
      return result.rows;
  }

  async getActivityById(id:number): Promise<Activity>{
    const result = await pool.query(`
      SELECT 
        a.*,
        p.site_name,
        p.building,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        CONCAT(
          UPPER(LEFT(u.first_name, 1)),
          UPPER(LEFT(u.last_name, 1))
        ) as user_initials
      FROM activities a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      throw new Error(`Activity with ID ${id} not found`);
    }
    
    return result.rows[0];
  }

  async getActivitesByPatientId(patientId:number): Promise<Activity[]>{
    const result = await pool.query(`
      SELECT 
        a.*,
        p.site_name,
        p.building,
        CONCAT(
          UPPER(LEFT(u.first_name, 1)),
          UPPER(LEFT(u.last_name, 1))
        ) as user_initials
      FROM activities a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.patient_id = $1
      ORDER BY a.created_at DESC
    `, [patientId]);
    return result.rows;
  }

  async deleteActivity(id:number): Promise<void>{
    await pool.query('DELETE FROM activities WHERE id = $1', [id]);
  }

  async updateActivity(id: number, activityDto: any): Promise<Activity>{
    try{
      const currentActivity = await this.getActivityById(id);
      if(!currentActivity){
        throw new Error("Activity not found");
      }

      // Filter out undefined values and handle data transformation
      const updateFields: Partial<Activity> = {};
      
      if (activityDto.patient_id !== undefined) updateFields.patient_id = activityDto.patient_id;
      if (activityDto.user_id !== undefined) updateFields.user_id = activityDto.user_id;
      if (activityDto.activity_type !== undefined) updateFields.activity_type = activityDto.activity_type;
      if (activityDto.pharm_flag !== undefined) updateFields.pharm_flag = activityDto.pharm_flag;
      if (activityDto.notes !== undefined) updateFields.notes = activityDto.notes;
      if (activityDto.building !== undefined) updateFields.building = activityDto.building;
      if (activityDto.site_name !== undefined) updateFields.site_name = activityDto.site_name;
      if (activityDto.duration_minutes !== undefined) updateFields.duration_minutes = activityDto.duration_minutes;
      
      // Handle service_datetime conversion
      if (activityDto.service_datetime !== undefined) {
        if (typeof activityDto.service_datetime === 'string') {
          updateFields.service_datetime = new Date(activityDto.service_datetime);
        } else {
          updateFields.service_datetime = activityDto.service_datetime;
        }
      }

      const fields = Object.keys(updateFields);
      const values = fields.map(field => updateFields[field]);

      if (fields.length === 0) {
        throw new Error("No valid fields to update");
      }

      const setString = fields.map((field,index) => `${field} = $${index + 1}`).join(', ');

      const query = `
        UPDATE activities
        SET ${setString}
        WHERE id = $${fields.length + 1}
        RETURNING *
      `;

      console.log('Update query:', query);
      console.log('Update values:', values);

      const result = await pool.query(query, [...values,id]);

      if(result.rows.length === 0){
        throw new Error("Failed to update activity");
      }
      
      // Return the updated activity with enriched data
      return await this.getActivityById(id);
    }catch(error){
      console.error('Error in updateActivity service:', error);
      throw error;
    }
  }
}