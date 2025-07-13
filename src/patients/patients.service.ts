import { Injectable } from '@nestjs/common';
import { pool } from '../config/database.config';
import { Patient } from './patient.interface';

@Injectable()
export class PatientsService {
  async createPatient(patient: Patient): Promise<Patient> {
    try {
      // Convert birthdate string to Date if needed
      const birthdate = typeof patient.birthdate === 'string' ? new Date(patient.birthdate) : patient.birthdate;
      
      const result = await pool.query(
        `INSERT INTO patients (
          first_name, last_name, birthdate, gender, phone_number,
          contact_name, contact_phone_number, insurance, is_active,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
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
      // Build WHERE conditions optimized for indexes
      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Status filter first (uses idx_patients_is_active)
      if (status && status !== 'all') {
        if (status === 'active') {
          whereConditions.push(`p.is_active = true`);
        } else if (status === 'inactive') {
          whereConditions.push(`p.is_active = false`);
        }
      }

      // Optimized search functionality leveraging GIN and trigram indexes
      if (search && search.trim()) {
        const searchTerm = search.trim();
        // Check if search looks like an ID (numbers only)
        if (/^\d+$/.test(searchTerm)) {
          whereConditions.push(`(
            p.id = $${paramIndex} OR
            p.first_name ILIKE $${paramIndex + 1} OR
            p.last_name ILIKE $${paramIndex + 1} OR
            (p.first_name || ' ' || p.last_name) ILIKE $${paramIndex + 1}
          )`);
          params.push(parseInt(searchTerm), `%${searchTerm}%`);
          paramIndex += 2;
        } else {
          // Text search using trigram similarity for better performance
          whereConditions.push(`(
            p.first_name % $${paramIndex} OR
            p.last_name % $${paramIndex} OR
            (p.first_name || ' ' || p.last_name) % $${paramIndex} OR
            p.first_name ILIKE $${paramIndex + 1} OR
            p.last_name ILIKE $${paramIndex + 1} OR
            (p.first_name || ' ' || p.last_name) ILIKE $${paramIndex + 1}
          )`);
          params.push(searchTerm, `%${searchTerm}%`);
          paramIndex += 2;
        }
      }

      // Site filter - Skip for now since we're not using site columns
      // if (site && site.trim()) {
      //   whereConditions.push(`s.name = $${paramIndex}`);
      //   params.push(site.trim());
      //   paramIndex++;
      // }

      // Building filter - Skip for now since we're not using building columns
      // if (building && building.trim()) {
      //   whereConditions.push(`p.building = $${paramIndex}`);
      //   params.push(building.trim());
      //   paramIndex++;
      // }

      // Build WHERE clause
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Optimize ORDER BY clause to use indexes effectively
      let orderByClause = 'ORDER BY p.created_at DESC'; // Uses idx_patients_created_at
      
      if (sortField && sortDirection) {
        const validSortFields = {
          'name': 'p.last_name, p.first_name', // Uses idx_patients_name
          'first_name': 'p.first_name',
          'last_name': 'p.last_name',
          'birthdate': 'p.birthdate',
          'gender': 'p.gender',
          'is_active': 'p.is_active',
          'created_at': 'p.created_at'
        };

        const actualSortField = validSortFields[sortField];
        if (actualSortField) {
          const direction = sortDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
          orderByClause = `ORDER BY ${actualSortField} ${direction}`;
        }
      }

      // Use a single optimized query with window functions for count
      const combinedQuery = `
        WITH patient_data AS (
          SELECT p.*, COUNT(*) OVER() as total_count
          FROM patients p
          ${whereClause}
          ${orderByClause}
          ${limit !== undefined && offset !== undefined ? `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}` : ''}
        )
        SELECT *, 
               CASE WHEN COUNT(*) OVER() > 0 THEN 
                 FIRST_VALUE(total_count) OVER (ORDER BY (SELECT NULL) ROWS UNBOUNDED PRECEDING)
               ELSE 0 END as total
        FROM patient_data
      `;
      
      // Add pagination params if needed
      if (limit !== undefined && offset !== undefined) {
        params.push(limit, offset);
      }

      const result = await pool.query(combinedQuery, params);
      
      // Extract total from first row or default to 0
      const total = result.rows.length > 0 ? parseInt(result.rows[0].total) : 0;
      
      // Remove the total_count and total columns from results
      const patients = result.rows.map(row => {
        const { total_count, total, ...patient } = row;
        return patient;
      });
      
      return { patients, total };
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
      // Build WHERE conditions optimized for indexes
      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Optimized user access check using idx_patients_site_user_access
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

      // Status filter (uses idx_patients_is_active)
      if (status && status !== 'all') {
        if (status === 'active') {
          whereConditions.push(`p.is_active = true`);
        } else if (status === 'inactive') {
          whereConditions.push(`p.is_active = false`);
        }
      }

      // Optimized search functionality
      if (search && search.trim()) {
        const searchTerm = search.trim();
        // Check if search looks like an ID
        if (/^\d+$/.test(searchTerm)) {
          whereConditions.push(`(
            p.id = $${paramIndex} OR
            p.first_name ILIKE $${paramIndex + 1} OR
            p.last_name ILIKE $${paramIndex + 1} OR
            (p.first_name || ' ' || p.last_name) ILIKE $${paramIndex + 1}
          )`);
          params.push(parseInt(searchTerm), `%${searchTerm}%`);
          paramIndex += 2;
        } else {
          // Trigram similarity search for better performance
          whereConditions.push(`(
            p.first_name % $${paramIndex} OR
            p.last_name % $${paramIndex} OR
            (p.first_name || ' ' || p.last_name) % $${paramIndex} OR
            p.first_name ILIKE $${paramIndex + 1} OR
            p.last_name ILIKE $${paramIndex + 1} OR
            (p.first_name || ' ' || p.last_name) ILIKE $${paramIndex + 1}
          )`);
          params.push(searchTerm, `%${searchTerm}%`);
          paramIndex += 2;
        }
      }

      // Site filter using idx_sites_name_lookup
      if (site && site.trim()) {
        whereConditions.push(`s.name = $${paramIndex}`);
        params.push(site.trim());
        paramIndex++;
      }

      // Building filter using idx_patients_building
      if (building && building.trim()) {
        whereConditions.push(`p.building = $${paramIndex}`);
        params.push(building.trim());
        paramIndex++;
      }

      // Build WHERE clause
      const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

      // Optimize ORDER BY clause
      let orderByClause = 'ORDER BY p.created_at DESC'; // Uses idx_patients_created_at
      
      if (sortField && sortDirection) {
        const validSortFields = {
          'name': 'p.last_name, p.first_name', // Uses idx_patients_name
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

      // Single optimized query with window functions
      const combinedQuery = `
        WITH patient_data AS (
          SELECT p.*, s.name as site_name, COUNT(*) OVER() as total_count
          FROM patients p
          LEFT JOIN sites s ON p.site_id = s.id
          ${whereClause}
          ${orderByClause}
          ${limit !== undefined && offset !== undefined ? `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}` : ''}
        )
        SELECT *, 
               CASE WHEN COUNT(*) OVER() > 0 THEN 
                 FIRST_VALUE(total_count) OVER (ORDER BY (SELECT NULL) ROWS UNBOUNDED PRECEDING)
               ELSE 0 END as total
        FROM patient_data
      `;
      
      // Add pagination params if needed
      if (limit !== undefined && offset !== undefined) {
        params.push(limit, offset);
      }

      const result = await pool.query(combinedQuery, params);
      
      // Extract total from first row or default to 0
      const total = result.rows.length > 0 ? parseInt(result.rows[0].total) : 0;
      
      // Remove the total_count and total columns from results
      const patients = result.rows.map(row => {
        const { total_count, total, ...patient } = row;
        return patient;
      });
      
      return { patients, total };
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
