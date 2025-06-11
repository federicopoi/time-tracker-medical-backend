import { Injectable } from "@nestjs/common";
import { pool } from "src/config/database.config";
import * as bcrypt from 'bcrypt';

export interface User {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  created_at?: Date;
  role: "admin" | "nurse" | "pharmacist";
  assignedsites_ids:number[];
  primarysite_id:number;
  new_password?: string;
  current_password?: string;
}

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10;

  async findOne(email: string, password: string): Promise<User | 'user_not_found' | 'invalid_password'> {
    try {
      const normalizedEmail = email.toLowerCase();
      
      const result = await pool.query(
        "SELECT * FROM users WHERE LOWER(email) = $1",
        [normalizedEmail]
      );
      
      const user = result.rows[0];
      if (!user) {
        return 'user_not_found';
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return 'invalid_password';
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async createUser(user: User): Promise<User> {
    try {
      if (!user.first_name || !user.last_name || !user.email || !user.password || !user.role || !user.primarysite_id || !user.assignedsites_ids) {
        throw new Error('Missing required fields');
      }

      const normalizedEmail = user.email.toLowerCase();
      const hashedPassword = await bcrypt.hash(user.password, this.SALT_ROUNDS);
      const assignedsites_ids = Array.isArray(user.assignedsites_ids) ? user.assignedsites_ids : [user.assignedsites_ids];

      const result = await pool.query(
        `INSERT INTO users (
          first_name, last_name, email, password, role, primarysite_id, assignedsites_ids
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          user.first_name,
          user.last_name,
          normalizedEmail,
          hashedPassword,
          user.role,
          user.primarysite_id,
          assignedsites_ids
        ]
      );
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('Email already exists');
      } else if (error.code === '22P02') {
        throw new Error('Invalid data format');
      }
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async getUsers(): Promise<any[]> {
    try {
      const result = await pool.query(`
        WITH assigned_sites_agg AS (
          SELECT 
            u.id as user_id,
            ARRAY_AGG(s_assigned.name) FILTER (WHERE s_assigned.name IS NOT NULL) as assigned_sites_names
          FROM users u
          LEFT JOIN LATERAL unnest(u.assignedsites_ids) AS assigned_site_id ON true
          LEFT JOIN sites s_assigned ON s_assigned.id = assigned_site_id
          GROUP BY u.id
        )
        SELECT 
          u.id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          u.email,
          u.role,
          s_primary.name as primary_site,
          COALESCE(asa.assigned_sites_names, ARRAY[]::text[]) as assigned_sites
        FROM users u
        LEFT JOIN sites s_primary ON s_primary.id = u.primarysite_id
        LEFT JOIN assigned_sites_agg asa ON asa.user_id = u.id
        ORDER BY u.last_name, u.first_name
      `);
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id: number): Promise<any | null> {
    try {
      const result = await pool.query(`
        WITH assigned_sites_agg AS (
          SELECT 
            u.id as user_id,
            ARRAY_AGG(s_assigned.name) FILTER (WHERE s_assigned.name IS NOT NULL) as assigned_sites_names
          FROM users u
          LEFT JOIN LATERAL unnest(u.assignedsites_ids) AS assigned_site_id ON true
          LEFT JOIN sites s_assigned ON s_assigned.id = assigned_site_id
          WHERE u.id = $1
          GROUP BY u.id
        )
        SELECT 
          u.id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          u.email,
          u.role,
          s_primary.name as primary_site,
          COALESCE(asa.assigned_sites_names, ARRAY[]::text[]) as assigned_sites
        FROM users u
        LEFT JOIN sites s_primary ON s_primary.id = u.primarysite_id
        LEFT JOIN assigned_sites_agg asa ON asa.user_id = u.id
        WHERE u.id = $1
      `, [id]);
      
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
  }

  async updateUser(id: number, user: Partial<User>): Promise<User> {
    try {
      const currentUser = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
      if (currentUser.rows.length === 0) {
        throw new Error("User not found");
      }

      if (user.email) {
        user.email = user.email.toLowerCase();
      }

      // Handle password update
      if (user.new_password) {
        user.password = await bcrypt.hash(user.new_password, this.SALT_ROUNDS);
        delete user.new_password; // Remove new_password from the object
        delete user.current_password; // Remove current_password if present
      }

      const fields = Object.keys(user).filter((key) => user[key] !== undefined);
      const values = fields.map((field) => user[field]);

      const setString = fields
        .map((field, index) => `${field} = $${index + 1}`)
        .join(", ");

      const query = `
      UPDATE users
      SET ${setString} 
      WHERE id = $${fields.length + 1} 
      RETURNING *
    `;
      const result = await pool.query(query, [...values, id]);
      if (result.rows.length === 0) {
        throw new Error("Failed to update user");
      }
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  async getUsersBySiteId(siteId: number): Promise<any[]> {
    try {
      const result = await pool.query(`
        WITH assigned_sites_agg AS (
          SELECT 
            u.id as user_id,
            ARRAY_AGG(s_assigned.name) FILTER (WHERE s_assigned.name IS NOT NULL) as assigned_sites_names
          FROM users u
          LEFT JOIN LATERAL unnest(u.assignedsites_ids) AS assigned_site_id ON true
          LEFT JOIN sites s_assigned ON s_assigned.id = assigned_site_id
          GROUP BY u.id
        )
        SELECT 
          u.id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          u.email,
          u.role,
          s_primary.name as primary_site,
          COALESCE(asa.assigned_sites_names, ARRAY[]::text[]) as assigned_sites
        FROM users u
        LEFT JOIN sites s_primary ON s_primary.id = u.primarysite_id
        LEFT JOIN assigned_sites_agg asa ON asa.user_id = u.id
        WHERE u.primarysite_id = $1 OR $1 = ANY(u.assignedsites_ids)
        ORDER BY u.last_name, u.first_name
      `, [siteId]);
      
      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}
