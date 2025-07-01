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

  async getActivites(): Promise<Activity[]> {
    const result = await pool.query(`
        SELECT 
          a.*,
          p.site_name,
          p.building,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name,
          CONCAT(
            UPPER(LEFT(u.first_name, 1)),
            UPPER(LEFT(u.last_name, 1))
          ) as user_initials
        FROM activities a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
      `);
    return result.rows;
  }

  async getActivitiesByUserAccess(userId: number): Promise<Activity[]> {
    try {
      // Get user's assigned sites
      const userResult = await pool.query(
        `SELECT primarysite_id, assignedsites_ids FROM users WHERE id = $1`,
        [userId],
      );

      if (userResult.rows.length === 0) {
        throw new Error("User not found");
      }

      const user = userResult.rows[0];
      const assignedSiteIds = [
        user.primarysite_id,
        ...(user.assignedsites_ids || []),
      ];

      // Get site names for the assigned site IDs
      const siteNamesResult = await pool.query(
        `SELECT name FROM sites WHERE id = ANY($1)`,
        [assignedSiteIds],
      );

      const siteNames = siteNamesResult.rows.map((row) => row.name);

      if (siteNames.length === 0) {
        return []; // User has no assigned sites
      }

      // Get activities for patients from assigned sites
      const result = await pool.query(
        `
        SELECT 
          a.*,
          p.site_name,
          p.building,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name,
          CONCAT(
            UPPER(LEFT(u.first_name, 1)),
            UPPER(LEFT(u.last_name, 1))
          ) as user_initials
        FROM activities a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.user_id = u.id
        WHERE p.site_name = ANY($1)
        ORDER BY a.created_at DESC
      `,
        [siteNames],
      );

      return result.rows;
    } catch (error) {
      throw new Error(
        `Failed to fetch activities for user access: ${error.message}`,
      );
    }
  }

  async getActivityById(id: number): Promise<Activity> {
    const result = await pool.query(
      `
      SELECT 
        a.*,
        p.site_name,
        p.building,
        CONCAT(p.first_name, ' ', p.last_name) as patient_name,
        CONCAT(
          UPPER(LEFT(u.first_name, 1)),
          UPPER(LEFT(u.last_name, 1))
        ) as user_initials
      FROM activities a
      LEFT JOIN patients p ON a.patient_id = p.id
      LEFT JOIN users u ON a.user_id = u.id
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
      // Get user's assigned sites
      const userResult = await pool.query(
        `SELECT primarysite_id, assignedsites_ids FROM users WHERE id = $1`,
        [userId],
      );

      if (userResult.rows.length === 0) {
        return null;
      }

      const user = userResult.rows[0];
      const assignedSiteIds = [
        user.primarysite_id,
        ...(user.assignedsites_ids || []),
      ];

      // Get site names for the assigned site IDs
      const siteNamesResult = await pool.query(
        `SELECT name FROM sites WHERE id = ANY($1)`,
        [assignedSiteIds],
      );

      const siteNames = siteNamesResult.rows.map((row) => row.name);

      if (siteNames.length === 0) {
        return null; // User has no assigned sites
      }

      // Get activity and check if the patient is in an assigned site
      const result = await pool.query(
        `
        SELECT 
          a.*,
          p.site_name,
          p.building,
          CONCAT(p.first_name, ' ', p.last_name) as patient_name,
          CONCAT(
            UPPER(LEFT(u.first_name, 1)),
            UPPER(LEFT(u.last_name, 1))
          ) as user_initials
        FROM activities a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.id = $1 AND p.site_name = ANY($2)
      `,
        [id, siteNames],
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
        p.site_name,
        p.building,
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
      // First check if user has access to the patient
      const hasAccess = await this.checkUserAccessToPatient(patientId, userId);
      if (!hasAccess) {
        return []; // User doesn't have access to this patient
      }

      // Then get activities for the patient
      return await this.getActivitesByPatientId(patientId);
    } catch (error) {
      throw new Error(
        `Failed to fetch activities for patient with access check: ${error.message}`,
      );
    }
  }

  async deleteActivity(id: number): Promise<void> {
    await pool.query("DELETE FROM activities WHERE id = $1", [id]);
  }

  async deleteActivityWithAccessCheck(
    id: number,
    userId: number,
  ): Promise<boolean> {
    try {
      // First check if user has access to this activity
      const existingActivity = await this.getActivityByIdWithAccessCheck(
        id,
        userId,
      );
      if (!existingActivity) {
        return false;
      }

      // Then delete the activity
      await this.deleteActivity(id);
      return true;
    } catch (error) {
      throw new Error(
        `Failed to delete activity with access check: ${error.message}`,
      );
    }
  }

  async updateActivity(id: number, activityDto: any): Promise<Activity> {
    try {
      const currentActivity = await this.getActivityById(id);
      if (!currentActivity) {
        throw new Error("Activity not found");
      }

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
      if (activityDto.building !== undefined)
        updateFields.building = activityDto.building;
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
        throw new Error("Failed to update activity");
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
      // Get user's assigned sites
      const userResult = await pool.query(
        `SELECT primarysite_id, assignedsites_ids FROM users WHERE id = $1`,
        [userId],
      );

      if (userResult.rows.length === 0) {
        return false;
      }

      const user = userResult.rows[0];
      const assignedSiteIds = [
        user.primarysite_id,
        ...(user.assignedsites_ids || []),
      ];

      // Get site names for the assigned site IDs
      const siteNamesResult = await pool.query(
        `SELECT name FROM sites WHERE id = ANY($1)`,
        [assignedSiteIds],
      );

      const siteNames = siteNamesResult.rows.map((row) => row.name);

      if (siteNames.length === 0) {
        return false; // User has no assigned sites
      }

      // Check if the patient is in one of the user's assigned sites
      const patientResult = await pool.query(
        `SELECT id FROM patients WHERE id = $1 AND site_name = ANY($2)`,
        [patientId, siteNames],
      );

      return patientResult.rows.length > 0;
    } catch (error) {
      console.error("Error checking user access to patient:", error);
      return false;
    }
  }
}
