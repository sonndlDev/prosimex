-- Migration: Fix Timezone in Attendance Table
ALTER TABLE attendance 
ALTER COLUMN check_in_time TYPE TIMESTAMPTZ,
ALTER COLUMN check_out_time TYPE TIMESTAMPTZ,
ALTER COLUMN created_at TYPE TIMESTAMPTZ,
ALTER COLUMN updated_at TYPE TIMESTAMPTZ;
