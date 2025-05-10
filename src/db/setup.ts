import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://tracking_time_db_user:1LC8xedIfsrRJcaYaqBoZYyRTFBUgm9V@dpg-d0fg0ds9c44c73bbhbr0-a.oregon-postgres.render.com/tracking_time_db',
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupDatabase() {
  try {
    // Create patients table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        birthdate DATE NOT NULL,
        gender CHAR(1) CHECK (gender IN ('M', 'F')),
        phone_number VARCHAR(20),
        contact_name VARCHAR(100),
        contact_phone_number VARCHAR(20),
        insurance VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        site_name VARCHAR(100) CHECK (site_name IN ('CP Greater San Antonio', 'CP Intermountain')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Patients table created successfully');

    // Create activities table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        patient_id INT NOT NULL,
        activity_type VARCHAR(255) NOT NULL,
        personnel_initials VARCHAR(10),
        pharm_flag BOOLEAN,
        notes TEXT,
        site_name VARCHAR(100) CHECK (site_name IN ('CP Greater San Antonio', 'CP Intermountain')),
        service_datetime TIMESTAMP NOT NULL,
        duration_minutes DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_patient
          FOREIGN KEY (patient_id)
          REFERENCES patients(id)
          ON DELETE CASCADE
      );
    `);
    console.log('Activities table created successfully');

    // Check if tables were created
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' 
      AND table_type='BASE TABLE';
    `);
    console.log('Available tables:', tables.rows.map(row => row.table_name));

  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    await pool.end();
  }
}

setupDatabase(); 