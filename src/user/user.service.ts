import { Injectable } from '@nestjs/common';
import { pool } from 'src/config/database.config';

@Injectable()
export class UserService {
  // Ensure you are using the Pool instance for database connections
  private db = pool;

  async getAllUsers() {
    try {
      const result = await this.db.query('SELECT * FROM users');
      return result.rows; // PostgreSQL returns an array in `rows`
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error('Error fetching users from the database');
    }
  }

  async createUser(name: string, email: string) {
    try {
      const result = await this.db.query(
        'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
        [name, email]
      );
      return result.rows[0]; // Return the first row from the result set
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Error creating user in the database');
    }
  }

  async findOne(email: string, password: string) {
    try {
      const result = await this.db.query(
        'SELECT * FROM users WHERE email = $1 AND password = $2 LIMIT 1',
        [email, password]
      );
      return result.rows[0]; // returns the user if found, otherwise undefined
    } catch (error) {
      console.error('Error finding user:', error);
      throw new Error('Error finding user in the database');
    }
  }
  
}
