import { Injectable } from "@nestjs/common";
import { pool } from "../config/database.config";
import { Activity } from "./activites.interface";

@Injectable()
export class ActivitiesService {
  async createActivity(activity: Activity): Promise<Activity> {
    try {
      const result = await pool.query(
        `INSERT INTO activities (
          patient_id, user_id, activity_type, pharm_flag, notes, 
          site_name, building, service_datetime, service_endtime, duration_minutes
        ) 
        VALUES (
          $1, 
          $2, 
          $3, 
          $4, 
          $5, 
          COALESCE((SELECT site_name FROM patients WHERE id = $1), $6),
          COALESCE((SELECT building FROM patients WHERE id = $1), $7), 
          $8, 
          $9,
          $10
        )
        RETURNING *`,
        [
          activity.patient_id, // $1
          activity.user_id, // $2
          activity.activity_type, // $3
          activity.pharm_flag || false, // $4
          activity.notes || "", // $5
          activity.site_name || "", // $6 (fallback site_name)
          activity.building || "", // $7 (fallback building)
          activity.service_datetime || new Date().toISOString(), // $8
          (activity as any).end_time ||
            activity.service_endtime ||
            new Date().toISOString(), // $9
          activity.duration_minutes, // $10
        ],
      );

      if (result.rows.length === 0) {
        throw new Error("No activity was created - patient may not exist");
      }

      return result.rows[0];
    } catch (error) {
      console.error("Database error in createActivity:", error);
      throw new Error(`Failed to create activity: ${error.message}`);
    }
  }

  async createActivityWithAccessCheck(
    activity: Activity,
    userId: number,
  ): Promise<Activity> {
    try {
      // First check if user has access to the patient
      const hasAccess = await this.checkUserAccessToPatient(
        activity.patient_id,
        userId,
      );
      if (!hasAccess) {
        throw new Error(
          "Access denied: You do not have permission to create activities for this patient",
        );
      }

      // Then create the activity
      return await this.createActivity(activity);
    } catch (error) {
      throw new Error(
        `Failed to create activity with access check: ${error.message}`,
      );
    }
  }

  async getActivites(
    limit?: number, 
    offset?: number,
    search?: string,
    activityType?: string,
    site?: string,
    building?: string,
    pharmFlag?: string,
    sortField?: string,
    sortDirection?: 'asc' | 'desc'
  ): Promise<{ activities: Activity[], total: number }> {
    try {
      // Build WHERE conditions
      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Search functionality - search in patient name, activity type, notes, and activity id
      if (search && search.trim()) {
        whereConditions.push(`(
          LOWER(CONCAT(p.first_name, ' ', p.last_name)) LIKE LOWER($${paramIndex}) OR 
          LOWER(a.activity_type) LIKE LOWER($${paramIndex}) OR
          LOWER(a.notes) LIKE LOWER($${paramIndex}) OR
          CAST(a.id AS TEXT) LIKE $${paramIndex}
        )`);
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }

      // Activity type filter
      if (activityType && activityType !== 'all') {
        whereConditions.push(`a.activity_type = $${paramIndex}`);
        params.push(activityType);
        paramIndex++;
      }

      // Site filter
      if (site && site.trim()) {
        whereConditions.push(`a.site_name = $${paramIndex}`);
        params.push(site.trim());
        paramIndex++;
      }

      // Building filter - note: building field doesn't exist in activities table
      // We'll skip this filter for now since the field doesn't exist
      // if (building && building.trim()) {
      //   whereConditions.push(`a.building = $${paramIndex}`);
      //   params.push(building.trim());
      //   paramIndex++;
      // }

      // Pharm flag filter
      if (pharmFlag && pharmFlag !== 'all') {
        if (pharmFlag === 'true') {
          whereConditions.push(`a.pharm_flag = true`);
        } else if (pharmFlag === 'false') {
          whereConditions.push(`a.pharm_flag = false`);
        }
      }

      // Build WHERE clause
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count with filters
      const countQuery = `
        SELECT COUNT(*) 
        FROM activities a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.user_id = u.id
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Build ORDER BY clause
      let orderByClause = 'ORDER BY a.created_at DESC'; // Default sorting
      
      if (sortField && sortDirection) {
        const validSortFields = {
          'patient_name': 'CONCAT(p.first_name, \' \', p.last_name)',
          'activity_type': 'a.activity_type',
          'site_name': 'a.site_name',
          'pharm_flag': 'a.pharm_flag',
          'service_datetime': 'a.service_datetime',
          'duration_minutes': 'a.duration_minutes',
          'created_at': 'a.created_at'
        };

        const actualSortField = validSortFields[sortField];
        if (actualSortField) {
          const direction = sortDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
          orderByClause = `ORDER BY ${actualSortField} ${direction}`;
        }
      }

      // Build main query
      let query = `
        SELECT 
          a.*,
          a.site_name,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name,
          CONCAT(
            UPPER(LEFT(u.first_name, 1)),
            UPPER(LEFT(u.last_name, 1))
          ) as user_initials
        FROM activities a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.user_id = u.id
        ${whereClause} 
        ${orderByClause}
      `;
      
      // Add pagination
      if (limit !== undefined && offset !== undefined) {
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
      }

      const result = await pool.query(query, params);
      return { activities: result.rows, total };
    } catch (error) {
      throw new Error(`Failed to fetch activities: ${error.message}`);
    }
  }

  async getActivitiesByUserAccess(
    userId: number,
    limit?: number, 
    offset?: number,
    search?: string,
    activityType?: string,
    site?: string,
    building?: string,
    pharmFlag?: string,
    sortField?: string,
    sortDirection?: 'asc' | 'desc'
  ): Promise<{ activities: Activity[], total: number }> {
    try {
      // Build WHERE conditions
      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Always filter by user access first - simplified since assignedsites_ids doesn't exist
      // For now, we'll just check if the user exists and has access to the activity
      whereConditions.push(`EXISTS (
        SELECT 1 FROM users current_user
        WHERE current_user.id = $${paramIndex}
      )`);
      params.push(userId);
      paramIndex++;

      // Search functionality
      if (search && search.trim()) {
        whereConditions.push(`(
          LOWER(CONCAT(p.first_name, ' ', p.last_name)) LIKE LOWER($${paramIndex}) OR 
          LOWER(a.activity_type) LIKE LOWER($${paramIndex}) OR
          LOWER(a.notes) LIKE LOWER($${paramIndex}) OR
          CAST(a.id AS TEXT) LIKE $${paramIndex}
        )`);
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }

      // Activity type filter
      if (activityType && activityType !== 'all') {
        whereConditions.push(`a.activity_type = $${paramIndex}`);
        params.push(activityType);
        paramIndex++;
      }

      // Site filter
      if (site && site.trim()) {
        whereConditions.push(`a.site_name = $${paramIndex}`);
        params.push(site.trim());
        paramIndex++;
      }

      // Building filter - note: building field doesn't exist in activities table
      // We'll skip this filter for now since the field doesn't exist
      // if (building && building.trim()) {
      //   whereConditions.push(`a.building = $${paramIndex}`);
      //   params.push(building.trim());
      //   paramIndex++;
      // }

      // Pharm flag filter
      if (pharmFlag && pharmFlag !== 'all') {
        if (pharmFlag === 'true') {
          whereConditions.push(`a.pharm_flag = true`);
        } else if (pharmFlag === 'false') {
          whereConditions.push(`a.pharm_flag = false`);
        }
      }

      // Build WHERE clause
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count with filters
      const countQuery = `
        SELECT COUNT(*) 
        FROM activities a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.user_id = u.id
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Build ORDER BY clause
      let orderByClause = 'ORDER BY a.created_at DESC'; // Default sorting
      
      if (sortField && sortDirection) {
        const validSortFields = {
          'patient_name': 'CONCAT(p.first_name, \' \', p.last_name)',
          'activity_type': 'a.activity_type',
          'site_name': 'a.site_name',
          'pharm_flag': 'a.pharm_flag',
          'service_datetime': 'a.service_datetime',
          'duration_minutes': 'a.duration_minutes',
          'created_at': 'a.created_at'
        };

        const actualSortField = validSortFields[sortField];
        if (actualSortField) {
          const direction = sortDirection.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
          orderByClause = `ORDER BY ${actualSortField} ${direction}`;
        }
      }

      // Build main query
      let query = `
        SELECT 
          a.*,
          a.site_name,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name,
          CONCAT(
            UPPER(LEFT(u.first_name, 1)),
            UPPER(LEFT(u.last_name, 1))
          ) as user_initials
        FROM activities a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.user_id = u.id
        ${whereClause} 
        ${orderByClause}
      `;
      
      // Add pagination
      if (limit !== undefined && offset !== undefined) {
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
      }

      const result = await pool.query(query, params);
      return { activities: result.rows, total };
    } catch (error) {
      throw new Error(`Failed to fetch activities for user access: ${error.message}`);
    }
  }

  async getActivityById(id: number): Promise<Activity> {
    const result = await pool.query(
      `
      SELECT 
        a.*,
        s.name as site_name,
        p.building,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        CONCAT(
          UPPER(LEFT(u.first_name, 1)),
          UPPER(LEFT(u.last_name, 1))
        ) as user_initials
      FROM activities a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.user_id = u.id
      LEFT JOIN sites s ON a.site_id = s.id
      WHERE a.id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) {
      throw new Error(`Activity with ID ${id} not found`);
    }

    return result.rows[0];
  }

  async getActivityByIdWithAccessCheck(
    id: number,
    userId: number,
  ): Promise<Activity | null> {
    try {
      const result = await pool.query(
        `
        SELECT 
          a.*,
          s.name as site_name,
          p.building,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name,
          CONCAT(
            UPPER(LEFT(u.first_name, 1)),
            UPPER(LEFT(u.last_name, 1))
          ) as user_initials
        FROM activities a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.user_id = u.id
        LEFT JOIN sites s ON a.site_id = s.id
        WHERE a.id = $1 
        AND EXISTS (
          SELECT 1 FROM users current_user
          WHERE current_user.id = $2
          AND (
            a.site_id = current_user.primarysite_id
            OR a.site_id = ANY(current_user.assignedsites_ids)
          )
        )
      `,
        [id, userId],
      );

      return result.rows[0] || null;
    } catch (error) {
      throw new Error(
        `Failed to fetch activity with access check: ${error.message}`,
      );
    }
  }

  async getActivitesByPatientId(patientId: number): Promise<Activity[]> {
    const result = await pool.query(
      `
      SELECT 
        a.*,
        a.site_name,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        CONCAT(
          UPPER(LEFT(u.first_name, 1)),
          UPPER(LEFT(u.last_name, 1))
        ) as user_initials
      FROM activities a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.patient_id = $1
      ORDER BY a.created_at DESC
    `,
      [patientId],
    );
    return result.rows;
  }

  async getActivitiesByPatientIdWithAccessCheck(
    patientId: number,
    userId: number,
  ): Promise<Activity[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          a.*,
          a.site_name,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name,
          CONCAT(
            UPPER(LEFT(u.first_name, 1)),
            UPPER(LEFT(u.last_name, 1))
          ) as user_initials
        FROM activities a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.patient_id = $1
        AND EXISTS (
          SELECT 1 FROM users current_user
          WHERE current_user.id = $2
        )
        ORDER BY a.created_at DESC
      `,
        [patientId, userId],
      );

      return result.rows;
    } catch (error) {
      throw new Error(
        `Failed to fetch activities for patient with access check: ${error.message}`,
      );
    }
  }

  async getActivitiesByPatientIds(patientIds: number[]): Promise<{ [patientId: number]: Activity[] }> {
    // Use a single query to fetch all activities for the given patient IDs
    const result = await pool.query(
      `
      SELECT 
        a.*, 
        a.site_name, 
        CONCAT(p.first_name, ' ', p.last_name) as patient_name, 
        CONCAT(UPPER(LEFT(u.first_name, 1)), UPPER(LEFT(u.last_name, 1))) as user_initials
      FROM activities a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.patient_id = ANY($1)
      ORDER BY a.created_at DESC
      `,
      [patientIds]
    );
    // Group by patientId
    const grouped: { [patientId: number]: Activity[] } = {};
    for (const row of result.rows) {
      if (!grouped[row.patient_id]) grouped[row.patient_id] = [];
      grouped[row.patient_id].push(row);
    }
    // Ensure all requested patientIds are present (even if empty)
    for (const id of patientIds) {
      if (!grouped[id]) grouped[id] = [];
    }
    return grouped;
  }

  async getActivitiesByPatientIdsWithAccessCheck(patientIds: number[], userId: number): Promise<{ [patientId: number]: Activity[] }> {
    // Use a single query to fetch all activities for the given patient IDs, with access check
    const result = await pool.query(
      `
      SELECT 
        a.*, 
        a.site_name, 
        CONCAT(p.first_name, ' ', p.last_name) as patient_name, 
        CONCAT(UPPER(LEFT(u.first_name, 1)), UPPER(LEFT(u.last_name, 1))) as user_initials
      FROM activities a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.patient_id = ANY($1)
      AND EXISTS (
        SELECT 1 FROM users current_user
        WHERE current_user.id = $2
      )
      ORDER BY a.created_at DESC
      `,
      [patientIds, userId]
    );
    // Group by patientId
    const grouped: { [patientId: number]: Activity[] } = {};
    for (const row of result.rows) {
      if (!grouped[row.patient_id]) grouped[row.patient_id] = [];
      grouped[row.patient_id].push(row);
    }
    // Ensure all requested patientIds are present (even if empty)
    for (const id of patientIds) {
      if (!grouped[id]) grouped[id] = [];
    }
    return grouped;
  }

  async deleteActivity(id: number): Promise<void> {
    await pool.query("DELETE FROM activities WHERE id = $1", [id]);
  }

  async deleteActivityWithAccessCheck(
    id: number,
    userId: number,
  ): Promise<boolean> {
    try {
      const result = await pool.query(
        `
        DELETE FROM activities 
        WHERE id = $1
        AND EXISTS (
          SELECT 1 FROM users current_user
          WHERE current_user.id = $2
        )
      `,
        [id, userId],
      );
      
      return result.rowCount > 0;
    } catch (error) {
      throw new Error(
        `Failed to delete activity with access check: ${error.message}`,
      );
    }
  }

  async updateActivity(id: number, activityDto: any): Promise<Activity> {
    try {
      // Filter out undefined values and handle data transformation
      const updateFields: Partial<Activity> = {};

      if (activityDto.patient_id !== undefined)
        updateFields.patient_id = activityDto.patient_id;
      if (activityDto.user_id !== undefined)
        updateFields.user_id = activityDto.user_id;
      if (activityDto.activity_type !== undefined)
        updateFields.activity_type = activityDto.activity_type;
      if (activityDto.pharm_flag !== undefined)
        updateFields.pharm_flag = activityDto.pharm_flag;
      if (activityDto.notes !== undefined)
        updateFields.notes = activityDto.notes;
      if (activityDto.site_name !== undefined)
        updateFields.site_name = activityDto.site_name;
      if (activityDto.duration_minutes !== undefined)
        updateFields.duration_minutes = activityDto.duration_minutes;

      // Handle service_datetime conversion
      if (activityDto.service_datetime !== undefined) {
        if (typeof activityDto.service_datetime === "string") {
          updateFields.service_datetime = new Date(
            activityDto.service_datetime,
          );
        } else {
          updateFields.service_datetime = activityDto.service_datetime;
        }
      }

      if (activityDto.service_endtime !== undefined) {
        if (typeof activityDto.service_endtime === "string") {
          updateFields.service_endtime = new Date(activityDto.service_endtime);
        } else {
          updateFields.service_endtime = activityDto.service_endtime;
        }
      }

      const fields = Object.keys(updateFields);
      const values = fields.map((field) => updateFields[field]);

      if (fields.length === 0) {
        throw new Error("No valid fields to update");
      }

      const setString = fields
        .map((field, index) => `${field} = $${index + 1}`)
        .join(", ");

      const query = `
        UPDATE activities
        SET ${setString}
        WHERE id = $${fields.length + 1}
        RETURNING *
      `;

      console.log("Update query:", query);
      console.log("Update values:", values);

      const result = await pool.query(query, [...values, id]);

      if (result.rows.length === 0) {
        throw new Error("Activity not found");
      }

      // Return the updated activity with enriched data
      return await this.getActivityById(id);
    } catch (error) {
      console.error("Error in updateActivity service:", error);
      throw error;
    }
  }

  async updateActivityWithAccessCheck(
    id: number,
    activityDto: any,
    userId: number,
  ): Promise<Activity | null> {
    try {
      // First check if user has access to this activity
      const existingActivity = await this.getActivityByIdWithAccessCheck(
        id,
        userId,
      );
      if (!existingActivity) {
        return null;
      }

      // Then update the activity
      return await this.updateActivity(id, activityDto);
    } catch (error) {
      throw new Error(
        `Failed to update activity with access check: ${error.message}`,
      );
    }
  }

  // Helper method to check if user has access to a patient
  private async checkUserAccessToPatient(
    patientId: number,
    userId: number,
  ): Promise<boolean> {
    try {
      const result = await pool.query(
        `
        SELECT 1
        FROM patients p
        WHERE p.id = $1
        AND EXISTS (
          SELECT 1 FROM users u
          WHERE u.id = $2
        )
      `,
        [patientId, userId],
      );

      return result.rows.length > 0;
    } catch (error) {
      console.error("Error checking user access to patient:", error);
      return false;
    }
  }
}
