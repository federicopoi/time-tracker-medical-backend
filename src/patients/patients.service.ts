import { Injectable } from '@nestjs/common';
import { pool } from '../config/database.config';
import { Patient } from './patient.interface';

@Injectable()
export class PatientsService {
  async createPatient(patient: Patient): Promise<Patient> {
    try {
      // Convert birthdate string to Date if needed
      const birthdate = typeof patient.birthdate === 'string' ? new Date(patient.birthdate) : patient.birthdate;
      
      // Look up site_id from site_name if provided
      let site_id = null;
      if (patient.site_name) {
        const siteResult = await pool.query('SELECT id FROM sites WHERE name = $1', [patient.site_name]);
        if (siteResult.rows.length > 0) {
          site_id = siteResult.rows[0].id;
        }
      }
      
      // Look up building_id from building name if provided
      let building_id = null;
      if (patient.building) {
        const buildingResult = await pool.query('SELECT id FROM buildings WHERE name = $1', [patient.building]);
        if (buildingResult.rows.length > 0) {
          building_id = buildingResult.rows[0].id;
        }
      }
      
      const result = await pool.query(
        `INSERT INTO patients (
          first_name, last_name, birthdate, gender, phone_number,
          contact_name, contact_phone_number, insurance, is_active, site_id, building_id,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          patient.first_name,
          patient.last_name,
          birthdate,
          patient.gender,
          patient.phone_number,
          patient.contact_name,
          patient.contact_phone_number,
          patient.insurance,
          patient.is_active,
          site_id,
          building_id,
          patient.notes
        ]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to create patient: ${error.message}`);
    }
  }

  async getPatients(
    limit?: number, 
    offset?: number,
    search?: string,
    site?: string,
    building?: string,
    status?: string,
    sortField?: string,
    sortDirection?: 'asc' | 'desc'
  ): Promise<{ patients: Patient[], total: number }> {
    try {
      // Build WHERE conditions
      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Search functionality - search in first_name, last_name, and id
      if (search && search.trim()) {
        whereConditions.push(`(
          LOWER(p.first_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(p.last_name) LIKE LOWER($${paramIndex}) OR
          LOWER(CONCAT(p.first_name, ' ', p.last_name)) LIKE LOWER($${paramIndex}) OR
          CAST(p.id AS TEXT) LIKE $${paramIndex}
        )`);
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }

      // Site filter
      if (site && site.trim()) {
        whereConditions.push(`s.name = $${paramIndex}`);
        params.push(site.trim());
        paramIndex++;
      }

      // Building filter
      if (building && building.trim()) {
        whereConditions.push(`b.name = $${paramIndex}`);
        params.push(building.trim());
        paramIndex++;
      }

      // Status filter
      if (status && status !== 'all') {
        if (status === 'active') {
          whereConditions.push(`p.is_active = true`);
        } else if (status === 'inactive') {
          whereConditions.push(`p.is_active = false`);
        }
      }

      // Build WHERE clause
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count with filters
      const countQuery = `
        SELECT COUNT(*) 
        FROM patients p
        LEFT JOIN sites s ON p.site_id = s.id
        LEFT JOIN buildings b ON p.building_id = b.id
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Build ORDER BY clause
      let orderByClause = 'ORDER BY p.created_at DESC'; // Default sorting
      
      if (sortField && sortDirection) {
        const validSortFields = {
          'name': 'p.first_name', // Map 'name' to 'first_name' for sorting
          'first_name': 'p.first_name',
          'last_name': 'p.last_name',
          'birthdate': 'p.birthdate',
          'gender': 'p.gender',
          'site_name': 's.name',
          'building': 'b.name',
          'is_active': 'p.is_active',
          'created_at': 'p.created_at'
        };

        const actualSortField = validSortFields[sortField];
        if (actualSortField) {
          const direction = sortDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
          orderByClause = `ORDER BY ${actualSortField} ${direction}`;
        }
      }

      // Build main query
      let query = `
        SELECT p.*, s.name as site_name, b.name as building
        FROM patients p
        LEFT JOIN sites s ON p.site_id = s.id
        LEFT JOIN buildings b ON p.building_id = b.id
        ${whereClause} 
        ${orderByClause}
      `;
      
      // Add pagination
      if (limit !== undefined && offset !== undefined) {
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
      }

      const result = await pool.query(query, params);
      return { patients: result.rows, total };
    } catch (error) {
      throw new Error(`Failed to fetch patients: ${error.message}`);
    }
  }

  async getPatientsByUserAccess(
    userId: number, 
    limit?: number, 
    offset?: number,
    search?: string,
    site?: string,
    building?: string,
    status?: string,
    sortField?: string,
    sortDirection?: 'asc' | 'desc'
  ): Promise<{ patients: Patient[], total: number }> {
    try {
      // Build WHERE conditions
      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Always filter by user access first
      whereConditions.push(`EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = $${paramIndex}
        AND (
          p.site_id = u.primarysite_id
          OR p.site_id = ANY(u.assignedsites_ids)
        )
      )`);
      params.push(userId);
      paramIndex++;

      // Search functionality
      if (search && search.trim()) {
        whereConditions.push(`(
          LOWER(p.first_name) LIKE LOWER($${paramIndex}) OR 
          LOWER(p.last_name) LIKE LOWER($${paramIndex}) OR
          LOWER(CONCAT(p.first_name, ' ', p.last_name)) LIKE LOWER($${paramIndex}) OR
          CAST(p.id AS TEXT) LIKE $${paramIndex}
        )`);
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }

      // Site filter
      if (site && site.trim()) {
        whereConditions.push(`s.name = $${paramIndex}`);
        params.push(site.trim());
        paramIndex++;
      }

      // Building filter
      if (building && building.trim()) {
        whereConditions.push(`b.name = $${paramIndex}`);
        params.push(building.trim());
        paramIndex++;
      }

      // Status filter
      if (status && status !== 'all') {
        if (status === 'active') {
          whereConditions.push(`p.is_active = true`);
        } else if (status === 'inactive') {
          whereConditions.push(`p.is_active = false`);
        }
      }

      // Build WHERE clause
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Get total count with filters
      const countQuery = `
        SELECT COUNT(*) 
        FROM patients p
        LEFT JOIN sites s ON p.site_id = s.id
        LEFT JOIN buildings b ON p.building_id = b.id
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Build ORDER BY clause
      let orderByClause = 'ORDER BY p.created_at DESC'; // Default sorting
      
      if (sortField && sortDirection) {
        const validSortFields = {
          'name': 'p.first_name',
          'first_name': 'p.first_name',
          'last_name': 'p.last_name',
          'birthdate': 'p.birthdate',
          'gender': 'p.gender',
          'site_name': 's.name',
          'building': 'p.building',
          'is_active': 'p.is_active',
          'created_at': 'p.created_at'
        };

        const actualSortField = validSortFields[sortField];
        if (actualSortField) {
          const direction = sortDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
          orderByClause = `ORDER BY ${actualSortField} ${direction}`;
        }
      }

      // Build main query
      let query = `
        SELECT p.*, s.name as site_name
        FROM patients p
        LEFT JOIN sites s ON p.site_id = s.id
        ${whereClause}
        ${orderByClause}
      `;
      
      // Add pagination
      if (limit !== undefined && offset !== undefined) {
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
      }

      const result = await pool.query(query, params);
      return { patients: result.rows, total };
    } catch (error) {
      throw new Error(`Failed to fetch patients by user access: ${error.message}`);
    }
  }

  async getPatientById(id: number): Promise<Patient> {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    return result.rows[0];
  }

  async getPatientByIdWithAccessCheck(id: number, userId: number): Promise<Patient | null> {
    try {
      const result = await pool.query(
        `
        SELECT p.*, s.name as site_name
        FROM patients p
        LEFT JOIN sites s ON p.site_id = s.id
        WHERE p.id = $1
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = $2
          AND (
            p.site_id = u.primarysite_id
            OR p.site_id = ANY(u.assignedsites_ids)
          )
        )
      `,
        [id, userId]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to fetch patient with access check: ${error.message}`);
    }
  }

  async updatePatient(id: number, patient: Partial<Patient>): Promise<Patient> {
    try {
      const fields = Object.keys(patient).filter(key => patient[key] !== undefined);
      const values = fields.map(field => patient[field]);
      
      if (fields.length === 0) {
        throw new Error('No fields to update');
      }
      
      const setString = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      
      const query = `
        UPDATE patients 
        SET ${setString} 
        WHERE id = $${fields.length + 1} 
        RETURNING *
      `;
      
      const result = await pool.query(query, [...values, id]);
      
      if (result.rows.length === 0) {
        throw new Error('Patient not found');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async updatePatientWithAccessCheck(id: number, patient: Partial<Patient>, userId: number): Promise<Patient | null> {
    try {
      const fields = Object.keys(patient).filter(key => patient[key] !== undefined);
      const values = fields.map(field => patient[field]);
      
      if (fields.length === 0) {
        throw new Error('No fields to update');
      }
      
      const setString = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      
      const query = `
        UPDATE patients 
        SET ${setString} 
        WHERE id = $${fields.length + 1}
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = $${fields.length + 2}
          AND (
            patients.site_id = u.primarysite_id
            OR patients.site_id = ANY(u.assignedsites_ids)
          )
        )
        RETURNING *
      `;
      
      const result = await pool.query(query, [...values, id, userId]);
      
      return result.rows[0] || null;
    } catch (error) {
      throw new Error(`Failed to update patient with access check: ${error.message}`);
    }
  }

  async deletePatient(id: number): Promise<void> {
    await pool.query('DELETE FROM patients WHERE id = $1', [id]);
  }

  async deletePatientWithAccessCheck(id: number, userId: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `
        DELETE FROM patients 
        WHERE id = $1
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = $2
          AND (
            patients.site_id = u.primarysite_id
            OR patients.site_id = ANY(u.assignedsites_ids)
          )
        )
      `,
        [id, userId]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(`Failed to delete patient with access check: ${error.message}`);
    }
  }

  async getPatientsBySiteName(siteName: string): Promise<Patient[]> {
    try {
      const result = await pool.query(
        `
        SELECT p.*, s.name as site_name
        FROM patients p
        LEFT JOIN sites s ON p.site_id = s.id
        WHERE s.name = $1
        ORDER BY p.created_at DESC
      `,
        [siteName]
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch patients for site ${siteName}: ${error.message}`);
    }
  }

  async getPatientsBySiteNameWithAccessCheck(siteName: string, userId: number): Promise<Patient[]> {
    try {
      const result = await pool.query(
        `
        SELECT p.*, s.name as site_name
        FROM patients p
        LEFT JOIN sites s ON p.site_id = s.id
        WHERE s.name = $1
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = $2
          AND (
            p.site_id = u.primarysite_id
            OR p.site_id = ANY(u.assignedsites_ids)
          )
        )
        ORDER BY p.created_at DESC
      `,
        [siteName, userId]
      );
      
      return result.rows;
    } catch (error) {
      throw new Error(`Failed to fetch patients for site with access check: ${error.message}`);
    }
  }
}
