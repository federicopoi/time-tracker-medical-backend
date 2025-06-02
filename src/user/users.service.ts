import { Injectable, OnModuleInit } from "@nestjs/common";
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
}

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly SALT_ROUNDS = 10;

  async onModuleInit() {
    // going to check if table exist
    try {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public'
          AND table_name = 'users'
        )  
      `);
      console.log("Users table exists:", tableCheck.rows[0].exists);

      if (!tableCheck.rows[0].exists) {
        console.log("Creating users table...");
        await pool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'nurse', 'pharmacist')),
            primarysite_id INTEGER NOT NULL,
            assignedsites_ids INTEGER[] NOT NULL DEFAULT '{}',
            CONSTRAINT fk_primarysite
              FOREIGN KEY (primarysite_id)
              REFERENCES sites(id)
              ON DELETE CASCADE
          );
        `);
        console.log("Users table created successfully");
      } else {
        // Check if we need to migrate from old schema
        const columnCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
          AND column_name IN ('primarysite', 'assignedsites', 'primarysite_id', 'assignedsites_ids')
        `);
        
        const hasOldColumns = columnCheck.rows.some(row => 
          row.column_name === 'primarysite' || row.column_name === 'assignedsites'
        );
        const hasNewColumns = columnCheck.rows.some(row => 
          row.column_name === 'primarysite_id' || row.column_name === 'assignedsites_ids'
        );

        if (hasOldColumns && !hasNewColumns) {
          console.log('Migrating users table to use site IDs...');
          
          // Add new columns
          await pool.query(`
            ALTER TABLE users 
            ADD COLUMN primarysite_id INTEGER,
            ADD COLUMN assignedsites_ids INTEGER[] DEFAULT '{}'
          `);
          
          // Migrate data from site names to site IDs
          await pool.query(`
            UPDATE users 
            SET primarysite_id = (SELECT id FROM sites WHERE name = users.primarysite)
            WHERE primarysite_id IS NULL
          `);

          // Update assignedsites_ids with site IDs
          const usersWithAssignedSites = await pool.query(`
            SELECT id, assignedsites FROM users WHERE assignedsites IS NOT NULL
          `);
          
          for (const user of usersWithAssignedSites.rows) {
            if (user.assignedsites && user.assignedsites.length > 0) {
              const siteIds: number[] = [];
              for (const siteName of user.assignedsites) {
                const siteResult = await pool.query('SELECT id FROM sites WHERE name = $1', [siteName]);
                if (siteResult.rows.length > 0) {
                  siteIds.push(siteResult.rows[0].id);
                }
              }
              if (siteIds.length > 0) {
                await pool.query(
                  'UPDATE users SET assignedsites_ids = $1 WHERE id = $2',
                  [siteIds, user.id]
                );
              }
            }
          }

          // Make primarysite_id NOT NULL and add foreign key
          await pool.query(`
            ALTER TABLE users 
            ALTER COLUMN primarysite_id SET NOT NULL,
            ADD CONSTRAINT fk_primarysite
              FOREIGN KEY (primarysite_id)
              REFERENCES sites(id)
              ON DELETE CASCADE
          `);

          // Drop old columns
          await pool.query(`
            ALTER TABLE users 
            DROP COLUMN primarysite,
            DROP COLUMN assignedsites
          `);
          
          console.log('Users table migration completed');
        }
      }
    } catch (error) {
      console.error("Error checking/creating users table", error);
    }
  }

  // check if user exist for auth 
  async findOne(email: string, password: string): Promise<User | null> {
    try {
      // Normalize email to lowercase for case-insensitive comparison
      const normalizedEmail = email.toLowerCase();
      
      const result = await pool.query(
        "SELECT * FROM users WHERE LOWER(email) = $1",
        [normalizedEmail]
      );
      
      const user = result.rows[0];
      if (!user) {
        return null;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return null;
      }

      return user;
    } catch (error) {
      console.error("Error finding user:", error);
      throw error;
    }
  }

  async createUser(user: User): Promise<User> {
    try {
      console.log("Attempting to create user with data", { ...user, password: '***' });
      
      // Validate required fields
      if (!user.first_name || !user.last_name || !user.email || !user.password || !user.role || !user.primarysite_id || !user.assignedsites_ids) {
        throw new Error('Missing required fields');
      }

      // Normalize email to lowercase for consistency
      const normalizedEmail = user.email.toLowerCase();

      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, this.SALT_ROUNDS);

      // Ensure assignedsites_ids is an array
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
      
      const createdUser = result.rows[0];
      console.log("User created successfully: ", { ...createdUser, password: '***' });
      return createdUser;
    } catch (error) {
      console.error("Error creating user:", error);
      if (error.code === '23505') {
        throw new Error('Email already exists');
      } else if (error.code === '22P02') {
        throw new Error('Invalid data format');
      }
      throw new Error(`Database error: ${error.message}`);
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      console.log('Fetching all users with site details');
      
      // Enhanced query to get all users with primary site and assigned site names
      const result = await pool.query(`
        WITH user_assigned_sites AS (
          SELECT 
            u.id as user_id,
            ARRAY_AGG(
              json_build_object(
                'id', s_assigned.id,
                'name', s_assigned.name
              )
            ) FILTER (WHERE s_assigned.id IS NOT NULL) as assigned_sites_details
          FROM users u
          LEFT JOIN LATERAL unnest(u.assignedsites_ids) AS assigned_site_id ON true
          LEFT JOIN sites s_assigned ON s_assigned.id = assigned_site_id
          GROUP BY u.id
        )
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          u.primarysite_id,
          u.assignedsites_ids,
          u.created_at,
          -- Primary site details
          s_primary.id as primary_site_id,
          s_primary.name as primary_site_name,
          s_primary.address as primary_site_address,
          s_primary.city as primary_site_city,
          s_primary.state as primary_site_state,
          s_primary.zip as primary_site_zip,
          s_primary.is_active as primary_site_is_active,
          -- Assigned sites details
          COALESCE(uas.assigned_sites_details, '[]'::json) as assigned_sites_details
        FROM users u
        LEFT JOIN sites s_primary ON s_primary.id = u.primarysite_id
        LEFT JOIN user_assigned_sites uas ON uas.user_id = u.id
        ORDER BY u.created_at DESC
      `);
      
      console.log(`Found ${result.rows.length} users with site details`);
      return result.rows;
    } catch (error) {
      console.error('Error fetching users with site details:', error);
      throw error;
    }
  }

  async getUserById(id: number): Promise<User | null> {
    try {
      console.log('Fetching user by ID with site details:', id);
      
      // Enhanced query to get user with primary site and assigned site names
      const result = await pool.query(`
        WITH user_assigned_sites AS (
          SELECT 
            u.id as user_id,
            ARRAY_AGG(
              json_build_object(
                'id', s_assigned.id,
                'name', s_assigned.name
              )
            ) FILTER (WHERE s_assigned.id IS NOT NULL) as assigned_sites_details
          FROM users u
          LEFT JOIN LATERAL unnest(u.assignedsites_ids) AS assigned_site_id ON true
          LEFT JOIN sites s_assigned ON s_assigned.id = assigned_site_id
          WHERE u.id = $1
          GROUP BY u.id
        )
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          u.primarysite_id,
          u.assignedsites_ids,
          u.created_at,
          -- Primary site details
          s_primary.id as primary_site_id,
          s_primary.name as primary_site_name,
          s_primary.address as primary_site_address,
          s_primary.city as primary_site_city,
          s_primary.state as primary_site_state,
          s_primary.zip as primary_site_zip,
          s_primary.is_active as primary_site_is_active,
          -- Assigned sites details
          COALESCE(uas.assigned_sites_details, '[]'::json) as assigned_sites_details
        FROM users u
        LEFT JOIN sites s_primary ON s_primary.id = u.primarysite_id
        LEFT JOIN user_assigned_sites uas ON uas.user_id = u.id
        WHERE u.id = $1
      `, [id]);
      
      console.log('Found user:', result.rows[0] ? 'Yes' : 'No');
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error finding user:", error);
      throw error;
    }
  }

  async deleteUser(id: number): Promise<void> {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
  }

  async updateUser(id: number, user: Partial<User>): Promise<User> {
    try {
      const currentUser = await this.getUserById(id);
      if (!currentUser) {
        throw new Error("User not found");
      }

      // Normalize email to lowercase if it's being updated
      if (user.email) {
        user.email = user.email.toLowerCase();
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
        throw new Error("Failed to users patient");
      }
      return result.rows[0];
    } catch (error) {
      console.error("Error updating user:", error);
      throw error;
    }
  }

  // Optimized query: Get users by site with site details using LEFT JOIN
  async getUsersBySiteWithDetails(siteName: string): Promise<any[]> {
    try {
      console.log('Fetching users for site with details:', siteName);
      
      // First get the site ID from the site name
      const siteResult = await pool.query('SELECT id FROM sites WHERE name = $1', [siteName]);
      if (siteResult.rows.length === 0) {
        throw new Error(`Site with name ${siteName} not found`);
      }
      
      const siteId = siteResult.rows[0].id;
      
      const result = await pool.query(`
        SELECT 
          u.*,
          s.id as site_id,
          s.name as site_name,
          s.address as site_address,
          s.city as site_city,
          s.state as site_state,
          s.zip as site_zip,
          s.is_active as site_is_active
        FROM users u
        LEFT JOIN sites s ON s.id = u.primarysite_id
        WHERE u.primarysite_id = $1 OR $1 = ANY(u.assignedsites_ids)
        ORDER BY u.last_name, u.first_name
      `, [siteId]);
      
      console.log(`Found ${result.rows.length} users for site ${siteName}`);
      return result.rows;
    } catch (error) {
      console.error('Error fetching users by site with details:', error);
      throw error;
    }
  }

  async getUsersBySiteId(siteId: number): Promise<any[]> {
    try {
      console.log('Fetching users for site ID:', siteId);
      
      // Enhanced query to get users with primary site and all assigned site names
      const result = await pool.query(`
        WITH user_assigned_sites AS (
          SELECT 
            u.id as user_id,
            ARRAY_AGG(
              json_build_object(
                'id', s_assigned.id,
                'name', s_assigned.name
              )
            ) FILTER (WHERE s_assigned.id IS NOT NULL) as assigned_sites_details
          FROM users u
          LEFT JOIN LATERAL unnest(u.assignedsites_ids) AS assigned_site_id ON true
          LEFT JOIN sites s_assigned ON s_assigned.id = assigned_site_id
          GROUP BY u.id
        )
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          u.primarysite_id,
          u.assignedsites_ids,
          u.created_at,
          -- Primary site details
          s_primary.id as primary_site_id,
          s_primary.name as primary_site_name,
          s_primary.address as primary_site_address,
          s_primary.city as primary_site_city,
          s_primary.state as primary_site_state,
          s_primary.zip as primary_site_zip,
          s_primary.is_active as primary_site_is_active,
          -- Assigned sites details
          COALESCE(uas.assigned_sites_details, '[]'::json) as assigned_sites_details
        FROM users u
        LEFT JOIN sites s_primary ON s_primary.id = u.primarysite_id
        LEFT JOIN user_assigned_sites uas ON uas.user_id = u.id
        WHERE u.primarysite_id = $1 OR $1 = ANY(u.assignedsites_ids)
        ORDER BY u.last_name, u.first_name
      `, [siteId]);
      
      console.log(`Found ${result.rows.length} users for site ID ${siteId}`);
      return result.rows;
    } catch (error) {
      console.error('Error fetching users by site ID:', error);
      throw error;
    }
  }

  // Optimized query: Get all users with their site details using LEFT JOIN
  async getUsersWithSiteDetails(): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          u.*,
          s.id as primary_site_id,
          s.name as primary_site_name,
          s.address as primary_site_address,
          s.city as primary_site_city,
          s.state as primary_site_state,
          s.zip as primary_site_zip,
          s.is_active as primary_site_is_active
        FROM users u
        LEFT JOIN sites s ON s.id = u.primarysite_id
        ORDER BY u.last_name, u.first_name
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error fetching users with site details:', error);
      throw error;
    }
  }

  // Optimized query: Get user by ID with all related site information
  async getUserByIdWithSiteDetails(id: number): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          u.*,
          s.id as primary_site_id,
          s.name as primary_site_name,
          s.address as primary_site_address,
          s.city as primary_site_city,
          s.state as primary_site_state,
          s.zip as primary_site_zip,
          s.is_active as primary_site_is_active
        FROM users u
        LEFT JOIN sites s ON s.id = u.primarysite_id
        WHERE u.id = $1
      `, [id]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching user by ID with site details:', error);
      throw error;
    }
  }
}
