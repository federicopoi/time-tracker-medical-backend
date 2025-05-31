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
    const result = await pool.query(
      'SELECT * FROM buildings WHERE site_id = $1 ORDER BY name ASC',
      [siteId]
    );
    return result.rows;
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

  // Optimized query: Get buildings with site information using LEFT JOIN
  async getBuildingsWithSiteInfo(siteId?: number): Promise<any[]> {
    try {
      let query = `
        SELECT 
          b.*,
          s.id as site_id,
          s.name as site_name,
          s.address as site_address,
          s.city as site_city,
          s.state as site_state,
          s.zip as site_zip,
          s.is_active as site_is_active,
          s.created_at as site_created_at
        FROM buildings b
        LEFT JOIN sites s ON b.site_id = s.id
      `;
      
      const params = [];
      if (siteId) {
        query += ' WHERE b.site_id = $1';
        params.push(siteId);
      }
      
      query += ' ORDER BY s.name ASC, b.name ASC';
      
      console.log('Fetching buildings with site info:', siteId ? `for site ${siteId}` : 'for all sites');
      const result = await pool.query(query, params);
      
      console.log(`Found ${result.rows.length} buildings with site info`);
      return result.rows;
    } catch (error) {
      console.error('Error fetching buildings with site info:', error);
      throw error;
    }
  }

  // Optimized query: Get building by ID with site information
  async getBuildingByIdWithSiteInfo(id: number): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          b.*,
          s.id as site_id,
          s.name as site_name,
          s.address as site_address,
          s.city as site_city,
          s.state as site_state,
          s.zip as site_zip,
          s.is_active as site_is_active,
          s.created_at as site_created_at
        FROM buildings b
        LEFT JOIN sites s ON b.site_id = s.id
        WHERE b.id = $1
      `, [id]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching building by ID with site info:', error);
      throw error;
    }
  }

  // Optimized query: Get buildings by site with patient and activity counts
  async getBuildingsBySiteWithCounts(siteId: number): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          b.*,
          s.id as site_id,
          s.name as site_name,
          s.address as site_address,
          s.city as site_city,
          s.state as site_state,
          s.zip as site_zip,
          s.is_active as site_is_active,
          (
            SELECT COUNT(*)::integer 
            FROM patients p 
            WHERE p.building = b.name AND p.site_name = s.name
          ) as patient_count,
          (
            SELECT COUNT(*)::integer 
            FROM patients p 
            WHERE p.building = b.name AND p.site_name = s.name AND p.is_active = true
          ) as active_patient_count
        FROM buildings b
        LEFT JOIN sites s ON b.site_id = s.id
        WHERE b.site_id = $1
        ORDER BY b.name ASC
      `, [siteId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching buildings by site with counts:', error);
      throw error;
    }
  }
}