-- Create buildings table
CREATE TABLE IF NOT EXISTS buildings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  site_id INT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_site
    FOREIGN KEY (site_id)
    REFERENCES sites(id)
    ON DELETE CASCADE
); 