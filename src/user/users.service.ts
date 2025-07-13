import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { pool } from "src/config/database.config";
import * as bcrypt from "bcrypt";

export interface User {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  created_at?: Date;
  role: "admin" | "nurse" | "pharmacist";
  assignedsites_ids: number[];
  primarysite_id: number;
  new_password?: string;
  current_password?: string;
}

@Injectable()
export class UsersService {
  private readonly SALT_ROUNDS = 10;

  async findOne(
    email: string,
    password: string,
  ): Promise<User | "user_not_found" | "invalid_password"> {
    try {
      const normalizedEmail = email.toLowerCase();

      const result = await pool.query(
        "SELECT * FROM users WHERE LOWER(email) = $1",
        [normalizedEmail],
      );

      const user = result.rows[0];
      if (!user) {
        return "user_not_found";
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return "invalid_password";
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  async createUser(user: User): Promise<User> {
    try {
      if (
        !user.first_name ||
        !user.last_name ||
        !user.email ||
        !user.password ||
        !user.role ||
        !user.primarysite_id ||
        !user.assignedsites_ids
      ) {
        throw new BadRequestException("Missing required fields");
      }

      const normalizedEmail = user.email.toLowerCase();
      const hashedPassword = await bcrypt.hash(user.password, this.SALT_ROUNDS);
      const assignedsites_ids = Array.isArray(user.assignedsites_ids)
        ? user.assignedsites_ids
        : [user.assignedsites_ids];

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
          assignedsites_ids,
        ],
      );

      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        throw new ConflictException(
          "An account with this email already exists. Please use a different email.",
        );
      } else if (error.code === "22P02") {
        throw new BadRequestException("Invalid data format");
      }
      throw new BadRequestException(`Database error: ${error.message}`);
    }
  }

  async getUsers(
    limit?: number, 
    offset?: number,
    search?: string,
    role?: string,
    site?: string,
    sortField?: string,
    sortDirection?: 'asc' | 'desc'
  ): Promise<{ users: any[], total: number }> {
    try {
      // Build WHERE conditions
      const whereConditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Search functionality - search in name and email
      if (search && search.trim()) {
        whereConditions.push(`(
          LOWER(CONCAT(u.first_name, ' ', u.last_name)) LIKE LOWER($${paramIndex}) OR 
          LOWER(u.email) LIKE LOWER($${paramIndex}) OR
          CAST(u.id AS TEXT) LIKE $${paramIndex}
        )`);
        params.push(`%${search.trim()}%`);
        paramIndex++;
      }

      // Role filter
      if (role && role !== 'all') {
        whereConditions.push(`u.role = $${paramIndex}`);
        params.push(role);
        paramIndex++;
      }

      // Site filter
      if (site && site !== 'all') {
        whereConditions.push(`(s_primary.name = $${paramIndex} OR $${paramIndex} = ANY(
          SELECT s_assigned.name 
          FROM unnest(u.assignedsites_ids) AS assigned_site_id
          JOIN sites s_assigned ON s_assigned.id = assigned_site_id
        ))`);
        params.push(site);
        paramIndex++;
      }

      // Build WHERE clause
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count with filters
      const countQuery = `
        SELECT COUNT(DISTINCT u.id) 
        FROM users u
        LEFT JOIN sites s_primary ON s_primary.id = u.primarysite_id
        LEFT JOIN LATERAL unnest(u.assignedsites_ids) AS assigned_site_id ON true
        LEFT JOIN sites s_assigned ON s_assigned.id = assigned_site_id
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].count);

      // Build ORDER BY clause
      let orderByClause = 'ORDER BY u.last_name, u.first_name'; // Default sorting
      
      if (sortField && sortDirection) {
        const validSortFields = {
          'name': 'CONCAT(u.first_name, \' \', u.last_name)',
          'email': 'u.email',
          'role': 'u.role',
          'primarysite': 's_primary.name',
          'created_at': 'u.created_at'
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
          u.id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          u.email,
          u.role,
          u.primarysite_id,
          u.assignedsites_ids,
          s_primary.name as primary_site,
          COALESCE(
            ARRAY_AGG(s_assigned.name) FILTER (WHERE s_assigned.name IS NOT NULL),
            ARRAY[]::text[]
          ) as assigned_sites
        FROM users u
        LEFT JOIN sites s_primary ON s_primary.id = u.primarysite_id
        LEFT JOIN LATERAL unnest(u.assignedsites_ids) AS assigned_site_id ON true
        LEFT JOIN sites s_assigned ON s_assigned.id = assigned_site_id
        ${whereClause}
        GROUP BY u.id, u.first_name, u.last_name, u.email, u.role, u.primarysite_id, u.assignedsites_ids, s_primary.name
        ${orderByClause}
      `;
      
      // Add pagination
      if (limit !== undefined && offset !== undefined) {
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
      }

      const result = await pool.query(query, params);
      return { users: result.rows, total };
    } catch (error) {
      throw error;
    }
  }

  async getUserById(id: number): Promise<any | null> {
    try {
      const result = await pool.query(
        `
        SELECT 
          u.id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          u.email,
          u.role,
          u.primarysite_id,
          u.assignedsites_ids,
          s_primary.name as primary_site,
          COALESCE(
            ARRAY_AGG(s_assigned.name) FILTER (WHERE s_assigned.name IS NOT NULL),
            ARRAY[]::text[]
          ) as assigned_sites
        FROM users u
        LEFT JOIN sites s_primary ON s_primary.id = u.primarysite_id
        LEFT JOIN LATERAL unnest(u.assignedsites_ids) AS assigned_site_id ON true
        LEFT JOIN sites s_assigned ON s_assigned.id = assigned_site_id
        WHERE u.id = $1
        GROUP BY u.id, u.first_name, u.last_name, u.email, u.role, u.primarysite_id, u.assignedsites_ids, s_primary.name
      `,
        [id],
      );

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

      if (fields.length === 0) {
        throw new BadRequestException("No fields to update");
      }

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
        throw new NotFoundException("User not found");
      }
      
      return result.rows[0];
    } catch (error) {
      if (error.code === "23505") {
        throw new ConflictException(
          "An account with this email already exists. Please use a different email.",
        );
      }
      throw error;
    }
  }

  async getUsersBySiteId(siteId: number): Promise<any[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          u.id,
          CONCAT(u.first_name, ' ', u.last_name) as name,
          u.email,
          u.role,
          u.primarysite_id,
          u.assignedsites_ids,
          s_primary.name as primary_site,
          COALESCE(
            ARRAY_AGG(s_assigned.name) FILTER (WHERE s_assigned.name IS NOT NULL),
            ARRAY[]::text[]
          ) as assigned_sites
        FROM users u
        LEFT JOIN sites s_primary ON s_primary.id = u.primarysite_id
        LEFT JOIN LATERAL unnest(u.assignedsites_ids) AS assigned_site_id ON true
        LEFT JOIN sites s_assigned ON s_assigned.id = assigned_site_id
        WHERE u.primarysite_id = $1 OR $1 = ANY(u.assignedsites_ids)
        GROUP BY u.id, u.first_name, u.last_name, u.email, u.role, u.primarysite_id, u.assignedsites_ids, s_primary.name
        ORDER BY u.last_name, u.first_name
      `,
        [siteId],
      );

      return result.rows;
    } catch (error) {
      throw error;
    }
  }
}
