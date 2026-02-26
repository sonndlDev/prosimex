-- Migration: Add Permissions to Users Table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';
