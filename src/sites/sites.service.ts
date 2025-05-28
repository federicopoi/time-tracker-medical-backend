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
} 