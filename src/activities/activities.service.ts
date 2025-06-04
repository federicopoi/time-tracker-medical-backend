import { Injectable,OnModuleInit} from '@nestjs/common';
import { pool } from '../config/database.config';
import { Activity } from './activites.interface';


@Injectable()
export class ActivitiesService implements OnModuleInit {
  async onModuleInit(){
    try{
      //check if table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'activities'
        );
      `);

      let shouldRecreateTable = true;


        if(shouldRecreateTable){
          await pool.query('DROP TABLE IF EXISTS activities CASCADE');
          await pool.query(`
            CREATE TABLE IF NOT EXISTS activities (
              id SERIAL PRIMARY KEY,
              patient_id INT NOT NULL,
              user_id INT NOT NULL,
              activity_type VARCHAR(50) NOT NULL,
              pharm_flag BOOLEAN DEFAULT FALSE,
              notes TEXT,
              site_name VARCHAR(100) NOT NULL,
              building VARCHAR(100),
              service_datetime TIMESTAMP NOT NULL,
              duration_minutes INT NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
          `);
        }
    }catch(error){
      throw new Error(`Error checking/creating activities table: ${error.message}`);
    }
  }

  async createActivity(activity:Activity):Promise<Activity>{
    try{
      const result = await pool.query(
        `INSERT INTO activities (
          patient_id, user_id, activity_type, pharm_flag, notes, site_name, building, service_datetime, duration_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          activity.patient_id,
          activity.user_id,
          activity.activity_type,
          activity.pharm_flag,
          activity.notes,
          activity.site_name,
          activity.building,
          activity.service_datetime,
          activity.duration_minutes
        ]
      );
      return result.rows[0];
    }catch(error){
      throw new Error(`Failed to create activity: ${error.message}`);
    }
  }

  async getActivites(): Promise<Activity[]>{
      const result = await pool.query('SELECT * FROM activites ORDER BY created_at DESC');
      return result.rows;
  }

  async getActivityById(id:number): Promise<Activity>{
    const result = await pool.query('SELECT * FROM activites WHERE id = $1', [id]);
    return result.rows[0];
  }

  async getActivitesByPatientId(patientId:number): Promise<Activity[]>{
    const result = await pool.query('SELECT * FROM activites WHERE patient_id = $1 ORDER BY created_at DESC', [patientId]);
    return result.rows;
  }

  async deleteActivity(id:number): Promise<void>{
    await pool.query('DELETE FROM activites WHERE id = $1', [id]);
  }

  async updateActivity(id: number,activity:Partial<Activity>): Promise<Activity>{
    try{
      const currentActivity = await this.getActivityById(id);
      if(!currentActivity){
        throw new Error("Acitivty not found");
      }

      const fields = Object.keys(activity).filter(key => activity[key] !== undefined);
      const values = fields.map(field => activity[field]);

      const setString = fields.map((field,index) => `${field} = $${index + 1}`).join(', ');

      const query = `
        UPDATE activities
        SET ${setString}
        WHERE id = $${fields.length + 1}
         RETURNING *
      `;

      const result = await pool.query(query, [...values,id]);

      if(result.rows.length === 0){
        throw new Error("Failed to update activity");
      }
      
      return result.rows[0];
    }catch(error){
      throw error;
    }
  }
}