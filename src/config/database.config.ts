import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://tracking_time_db_user:1LC8xedIfsrRJcaYaqBoZYyRTFBUgm9V@dpg-d0fg0ds9c44c73bbhbr0-a.oregon-postgres.render.com/tracking_time_db',
  ssl: {
    rejectUnauthorized: false
  }
}); 