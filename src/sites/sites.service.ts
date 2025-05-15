import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { Site, CreateSiteDto, UpdateSiteDto } from './site.interface';

@Injectable()
export class SitesService {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  async createSite(createSiteDto: CreateSiteDto): Promise<Site> {
    const { name, address, city, state, zip, is_active = true } = createSiteDto;
    const query = `
      INSERT INTO sites (name, address, city, state, zip, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const values = [name, address, city, state, zip, is_active];
    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getAllSites(): Promise<Site[]> {
    const query = 'SELECT * FROM sites ORDER BY name';
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getSiteById(id: number): Promise<Site> {
    const query = 'SELECT * FROM sites WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows[0];
  }

  async getSiteByName(name: string): Promise<Site> {
    const query = 'SELECT * FROM sites WHERE name = $1';
    const result = await this.pool.query(query, [name]);
    return result.rows[0];
  }

  async updateSite(id: number, updateSiteDto: UpdateSiteDto): Promise<Site> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updateSiteDto).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (updates.length === 0) return this.getSiteById(id);

    values.push(id);
    const query = `
      UPDATE sites 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async deleteSite(id: number): Promise<void> {
    const query = 'DELETE FROM sites WHERE id = $1';
    await this.pool.query(query, [id]);
  }
} 