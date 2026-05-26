-- Migration: Enhance Roles table with system flag and default role
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;

-- Ensure standard roles exist and are marked as system roles
INSERT INTO roles (name, is_system) VALUES 
('ADMIN', TRUE),
('OPERATOR', TRUE),
('PLANNER', TRUE),
('DEFAULT_USER', TRUE)
ON CONFLICT (name) DO UPDATE SET is_system = EXCLUDED.is_system;

-- Logic for deletion will be handled in the controller to reassign users
