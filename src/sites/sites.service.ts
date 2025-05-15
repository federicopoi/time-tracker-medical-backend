import { Injectable, OnModuleInit } from '@nestjs/common';
import { pool } from '../config/database.config';
import { Site, CreateSiteDto, UpdateSiteDto } from './site.interface';

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

  async createSite(createSiteDto: CreateSiteDto): Promise<Site> {
    try {
      console.log('Attempting to create site with data:', createSiteDto);
      const { name, address, city, state, zip, is_active = true } = createSiteDto;
      const query = `
        INSERT INTO sites (name, address, city, state, zip, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const values = [name, address, city, state, zip, is_active];
      const result = await pool.query(query, values);
      console.log('Site created successfully:', result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating site:', error);
      throw new Error(`Failed to create site: ${error.message}`);
    }
  }

  async getAllSites(): Promise<Site[]> {
    try {
      const result = await pool.query('SELECT * FROM sites ORDER BY name');
      return result.rows;
    } catch (error) {
      console.error('Error getting all sites:', error);
      throw new Error(`Failed to get sites: ${error.message}`);
    }
  }

  async getSiteById(id: number): Promise<Site> {
    try {
      const result = await pool.query('SELECT * FROM sites WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting site by id:', error);
      throw new Error(`Failed to get site: ${error.message}`);
    }
  }

  async getSiteByName(name: string): Promise<Site> {
    try {
      const result = await pool.query('SELECT * FROM sites WHERE name = $1', [name]);
      return result.rows[0];
    } catch (error) {
      console.error('Error getting site by name:', error);
      throw new Error(`Failed to get site: ${error.message}`);
    }
  }

  async updateSite(id: number, updateSiteDto: UpdateSiteDto): Promise<Site> {
    try {
      const currentSite = await this.getSiteById(id);
      if (!currentSite) {
        throw new Error('Site not found');
      }

      const fields = Object.keys(updateSiteDto).filter(key => updateSiteDto[key] !== undefined);
      const values = fields.map(field => updateSiteDto[field]);
      
      const setString = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      
      const query = `
        UPDATE sites 
        SET ${setString} 
        WHERE id = $${fields.length + 1} 
        RETURNING *
      `;
      
      const result = await pool.query(query, [...values, id]);
      
      if (result.rows.length === 0) {
        throw new Error('Failed to update site');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error updating site:', error);
      throw error;
    }
  }

  async deleteSite(id: number): Promise<void> {
    try {
      await pool.query('DELETE FROM sites WHERE id = $1', [id]);
    } catch (error) {
      console.error('Error deleting site:', error);
      throw new Error(`Failed to delete site: ${error.message}`);
    }
  }
} 