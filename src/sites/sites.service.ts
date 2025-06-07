import { Injectable } from '@nestjs/common';
import { pool } from '../config/database.config';

export interface Site {
  id?: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  is_active: boolean;
  created_at?: Date;
}

@Injectable()
export class SitesService {
  async createSite(site: Site): Promise<Site> {
    const result = await pool.query(
      `INSERT INTO sites (
        name, address, city, state, zip, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        site.name,
        site.address,
        site.city,
        site.state,
        site.zip,
        site.is_active ?? true,
      ]
    );
    return result.rows[0];
  }

  async getSites(): Promise<Site[]> {
    const result = await pool.query('SELECT * FROM sites ORDER BY name ASC');
    return result.rows;
  }

  async getSiteById(id: number): Promise<Site> {
    const result = await pool.query('SELECT * FROM sites WHERE id = $1', [id]);
    return result.rows[0];
  }

  async updateSite(id: number, site: Partial<Site>): Promise<Site> {
    const fields = Object.keys(site);
    const values = Object.values(site);
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    const setString = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const query = `UPDATE sites SET ${setString} WHERE id = $${fields.length + 1} RETURNING *`;
    
    const result = await pool.query(query, [...values, id]);
    
    if (result.rows.length === 0) {
      throw new Error('Site not found');
    }
    
    return result.rows[0];
  }

  async deleteSite(id: number): Promise<void> {
    try {
      await pool.query('DELETE FROM sites WHERE id = $1', [id]);
    } catch (error) {
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Cannot delete site: There are users assigned to this site. Please reassign users to different sites before deleting.');
      }
      throw error;
    }
  }

  // Get all sites with their building names
  async getSitesAndBuildings(): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          s.name as site_name,
          COALESCE(
            json_agg(
              DISTINCT CASE 
                WHEN b.name IS NOT NULL THEN b.name
                ELSE NULL
              END
            ) FILTER (WHERE b.name IS NOT NULL),
            '[]'::json
          ) as building_names
        FROM sites s
        LEFT JOIN buildings b ON s.id = b.site_id
        GROUP BY s.name
        ORDER BY s.name ASC
      `);
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
} 