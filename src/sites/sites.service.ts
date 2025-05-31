import { Injectable, OnModuleInit } from '@nestjs/common';
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
export class SitesService implements OnModuleInit {
  async onModuleInit() {
    try {
      // Check if table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'sites'
        );
      `);
      console.log('Sites table exists:', tableCheck.rows[0].exists);

      if (!tableCheck.rows[0].exists) {
        console.log('Creating sites table...');
        await pool.query(`
          CREATE TABLE IF NOT EXISTS sites (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            address VARCHAR(255) NOT NULL,
            city VARCHAR(100) NOT NULL,
            state VARCHAR(50) NOT NULL,
            zip VARCHAR(20) NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('Sites table created successfully');
      }
    } catch (error) {
      console.error('Error checking/creating sites table:', error);
    }
  }

  async createSite(site: Site): Promise<Site> {
    console.log('Creating site with data:', site);
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
    console.log('Created site:', result.rows[0]);
    return result.rows[0];
  }

  async getSites(): Promise<Site[]> {
    const result = await pool.query('SELECT * FROM sites ORDER BY name ASC');
    return result.rows;
  }

  async getSiteById(id: number): Promise<Site> {
    console.log('Fetching site with id:', id);
    const result = await pool.query('SELECT * FROM sites WHERE id = $1', [id]);
    console.log('Fetched site:', result.rows[0]);
    return result.rows[0];
  }

  async updateSite(id: number, site: Partial<Site>): Promise<Site> {
    console.log(`Updating site ${id} with data:`, site);
    
    const fields = Object.keys(site);
    const values = Object.values(site);
    
    if (fields.length === 0) {
      console.log('No fields to update');
      throw new Error('No fields to update');
    }
    
    const setString = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    const query = `UPDATE sites SET ${setString} WHERE id = $${fields.length + 1} RETURNING *`;
    
    console.log('Executing SQL query:', query);
    console.log('With values:', [...values, id]);
    
    const result = await pool.query(query, [...values, id]);
    
    console.log('Query result:', result.rows);
    
    if (result.rows.length === 0) {
      console.log(`No site found with ID ${id}`);
      throw new Error('Site not found');
    }
    
    console.log('Site updated successfully:', result.rows[0]);
    return result.rows[0];
  }

  async deleteSite(id: number): Promise<void> {
    await pool.query('DELETE FROM sites WHERE id = $1', [id]);
  }

  // Optimized query: Get site with all details (buildings, users, patient counts) using LEFT JOINs
  async getSiteWithAllDetails(siteId: number): Promise<any> {
    try {
      console.log('Fetching comprehensive site details for ID:', siteId);
      
      const result = await pool.query(`
        SELECT 
          s.*,
          COALESCE(
            json_agg(
              DISTINCT CASE 
                WHEN b.id IS NOT NULL THEN
                  json_build_object(
                    'id', b.id,
                    'name', b.name,
                    'is_active', b.is_active,
                    'created_at', b.created_at
                  )
                ELSE NULL
              END
            ) FILTER (WHERE b.id IS NOT NULL),
            '[]'::json
          ) as buildings,
          COALESCE(
            json_agg(
              DISTINCT CASE 
                WHEN u.id IS NOT NULL THEN
                  json_build_object(
                    'id', u.id,
                    'first_name', u.first_name,
                    'last_name', u.last_name,
                    'email', u.email,
                    'role', u.role,
                    'primarysite', u.primarysite,
                    'assignedsites', u.assignedsites
                  )
                ELSE NULL
              END
            ) FILTER (WHERE u.id IS NOT NULL),
            '[]'::json
          ) as users,
          (
            SELECT COUNT(*)::integer 
            FROM patients p 
            WHERE p.site_name = s.name
          ) as patient_count,
          (
            SELECT COUNT(*)::integer 
            FROM patients p 
            WHERE p.site_name = s.name AND p.is_active = true
          ) as active_patient_count,
          (
            SELECT COUNT(*)::integer 
            FROM activities a 
            WHERE a.site_name = s.name
          ) as total_activities_count
        FROM sites s
        LEFT JOIN buildings b ON s.id = b.site_id
        LEFT JOIN users u ON s.name = u.primarysite OR s.name = ANY(u.assignedsites)
        WHERE s.id = $1
        GROUP BY s.id, s.name, s.address, s.city, s.state, s.zip, s.is_active, s.created_at
      `, [siteId]);
      
      console.log(`Found site with ${result.rows[0]?.buildings?.length || 0} buildings and ${result.rows[0]?.users?.length || 0} users`);
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching site with all details:', error);
      throw error;
    }
  }

  // Optimized query: Get site by name with all details
  async getSiteByNameWithAllDetails(siteName: string): Promise<any> {
    try {
      console.log('Fetching comprehensive site details for name:', siteName);
      
      const result = await pool.query(`
        SELECT 
          s.*,
          COALESCE(
            json_agg(
              DISTINCT CASE 
                WHEN b.id IS NOT NULL THEN
                  json_build_object(
                    'id', b.id,
                    'name', b.name,
                    'is_active', b.is_active,
                    'created_at', b.created_at
                  )
                ELSE NULL
              END
            ) FILTER (WHERE b.id IS NOT NULL),
            '[]'::json
          ) as buildings,
          COALESCE(
            json_agg(
              DISTINCT CASE 
                WHEN u.id IS NOT NULL THEN
                  json_build_object(
                    'id', u.id,
                    'first_name', u.first_name,
                    'last_name', u.last_name,
                    'email', u.email,
                    'role', u.role,
                    'primarysite', u.primarysite,
                    'assignedsites', u.assignedsites
                  )
                ELSE NULL
              END
            ) FILTER (WHERE u.id IS NOT NULL),
            '[]'::json
          ) as users,
          (
            SELECT COUNT(*)::integer 
            FROM patients p 
            WHERE p.site_name = s.name
          ) as patient_count,
          (
            SELECT COUNT(*)::integer 
            FROM patients p 
            WHERE p.site_name = s.name AND p.is_active = true
          ) as active_patient_count,
          (
            SELECT COUNT(*)::integer 
            FROM activities a 
            WHERE a.site_name = s.name
          ) as total_activities_count
        FROM sites s
        LEFT JOIN buildings b ON s.id = b.site_id
        LEFT JOIN users u ON s.name = u.primarysite OR s.name = ANY(u.assignedsites)
        WHERE s.name = $1
        GROUP BY s.id, s.name, s.address, s.city, s.state, s.zip, s.is_active, s.created_at
      `, [siteName]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching site by name with all details:', error);
      throw error;
    }
  }

  // Optimized query: Get all sites with summary statistics
  async getSitesWithSummaryStats(): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          s.*,
          COUNT(DISTINCT b.id)::integer as building_count,
          COUNT(DISTINCT u.id)::integer as user_count,
          (
            SELECT COUNT(*)::integer 
            FROM patients p 
            WHERE p.site_name = s.name
          ) as patient_count,
          (
            SELECT COUNT(*)::integer 
            FROM patients p 
            WHERE p.site_name = s.name AND p.is_active = true
          ) as active_patient_count,
          (
            SELECT COUNT(*)::integer 
            FROM activities a 
            WHERE a.site_name = s.name
          ) as total_activities_count
        FROM sites s
        LEFT JOIN buildings b ON s.id = b.site_id
        LEFT JOIN users u ON s.name = u.primarysite OR s.name = ANY(u.assignedsites)
        GROUP BY s.id, s.name, s.address, s.city, s.state, s.zip, s.is_active, s.created_at
        ORDER BY s.name ASC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching sites with summary stats:', error);
      throw error;
    }
  }
} 