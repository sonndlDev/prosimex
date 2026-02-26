-- Create workers table for production management
CREATE TABLE IF NOT EXISTS workers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    factory_id INT REFERENCES factories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_workers_factory ON workers(factory_id);
CREATE INDEX IF NOT EXISTS idx_workers_code ON workers(code);
