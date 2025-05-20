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
  assignedsites:string[];
  primarysite:string;
}

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly SALT_ROUNDS = 10;

  async onModuleInit() {
    // gonig to check if table exist
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
            primarysite VARCHAR(50) NOT NULL,
            assignedsites TEXT[] NOT NULL DEFAULT '{}'
          );
        `);
        console.log("Users table created successfully");
      }
    } catch (error) {
      console.error("Error checking/creating users table", error);
    }
  }

  // check if user exist for auth 
  async findOne(email: string, password: string): Promise<User | null> {
    try {
      const result = await pool.query(
        "SELECT * FROM users WHERE email = $1",
        [email]
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
      if (!user.first_name || !user.last_name || !user.email || !user.password || !user.role || !user.primarysite || !user.assignedsites) {
        throw new Error('Missing required fields');
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(user.password, this.SALT_ROUNDS);

      // Ensure assignedsites is an array
      const assignedsites = Array.isArray(user.assignedsites) ? user.assignedsites : [user.assignedsites];

      const result = await pool.query(
        `INSERT INTO users (
          first_name, last_name, email, password, role, primarysite, assignedsites
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          user.first_name,
          user.last_name,
          user.email,
          hashedPassword,
          user.role,
          user.primarysite,
          assignedsites
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
    const result = await pool.query(
      `SELECT * FROM users ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async getUserById(id: number): Promise<User> {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    return result.rows[0];
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

  
}
