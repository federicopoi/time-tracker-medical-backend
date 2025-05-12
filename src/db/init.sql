-- Create the database if it doesn't exist
CREATE DATABASE medical_tracker;

-- Connect to the database
\c medical_tracker;

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

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


