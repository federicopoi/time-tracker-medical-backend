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
    const fields = Object.keys(site);
    const values = Object.values(site);
    const setString = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
    
    const result = await pool.query(
      `UPDATE sites SET ${setString} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  }

  async deleteSite(id: number): Promise<void> {
    await pool.query('DELETE FROM sites WHERE id = $1', [id]);
  }
} 