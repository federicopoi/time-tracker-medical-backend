import { Injectable } from '@nestjs/common';
import { pool } from '../config/database.config';
import { Building, CreateBuildingDto, UpdateBuildingDto } from './building.interface';

@Injectable()
export class BuildingsService {
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
} 