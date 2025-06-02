import { Injectable, OnModuleInit } from '@nestjs/common';
import { pool } from '../config/database.config';
import { Building, CreateBuildingDto, UpdateBuildingDto } from './building.interface';

@Injectable()
export class BuildingsService implements OnModuleInit {
  async onModuleInit() {
    try {
      // Check if table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'buildings'
        );
      `);
      console.log('Buildings table exists:', tableCheck.rows[0].exists);

      if (!tableCheck.rows[0].exists) {
        console.log('Creating buildings table...');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS buildings (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            site_id INT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_site
              FOREIGN KEY (site_id)
              REFERENCES sites(id)
              ON DELETE CASCADE
          );
        `);
        console.log('Buildings table created successfully');
      }
    } catch (error) {
      console.error('Error checking/creating buildings table:', error);
    }
  }

  async createBuilding(building: CreateBuildingDto): Promise<Building> {
    const result = await pool.query(
      `INSERT INTO buildings (name, site_id, is_active)
       VALUES ($1, $2, $3) RETURNING *`,
      [building.name, building.site_id, building.is_active ?? true]
    );
    return result.rows[0];
  }

  async getBuildings(): Promise<Building[]> {
    const result = await pool.query('SELECT * FROM buildings ORDER BY name ASC');
    return result.rows;
  }

  async getBuildingsBySiteId(siteId: number): Promise<Building[]> {
    try {
      console.log('Fetching buildings for site ID:', siteId);
      const result = await pool.query(
        `SELECT 
          id,
          name,
          site_id,
          is_active,
          created_at
        FROM buildings 
        WHERE site_id = $1 
        ORDER BY name ASC`,
        [siteId]
      );
      console.log(`Found ${result.rows.length} buildings for site ID ${siteId}`);
      return result.rows;
    } catch (error) {
      console.error('Error fetching buildings by site ID:', error);
      throw error;
    }
  }

  async getBuildingById(id: number): Promise<Building> {
    const result = await pool.query('SELECT * FROM buildings WHERE id = $1', [id]);
    return result.rows[0];
  }

  async updateBuilding(id: number, building: UpdateBuildingDto): Promise<Building> {
    const fields = Object.keys(building);
    const values = Object.values(building);
    const setString = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    
    const result = await pool.query(
      `UPDATE buildings SET ${setString} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  }

  async deleteBuilding(id: number): Promise<void> {
    await pool.query('DELETE FROM buildings WHERE id = $1', [id]);
  }
}