-- Migration: Add a new role (e.g., MANAGER)
INSERT INTO roles (name) VALUES ('MANAGER') ON CONFLICT (name) DO NOTHING;
