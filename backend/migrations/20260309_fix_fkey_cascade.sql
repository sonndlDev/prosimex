-- Add ON DELETE CASCADE to foreign keys of machine_schedules table
-- First, drop existing constraints if they exist
ALTER TABLE machine_schedules DROP CONSTRAINT IF EXISTS machine_schedules_production_plan_id_fkey;

-- Re-add with CASCADE
ALTER TABLE machine_schedules 
ADD CONSTRAINT machine_schedules_production_plan_id_fkey 
FOREIGN KEY (production_plan_id) 
REFERENCES production_plans(id) 
ON DELETE CASCADE;

-- Also check production_plan_days as it's common to need it there too
ALTER TABLE production_plan_days DROP CONSTRAINT IF EXISTS production_plan_days_production_plan_id_fkey;

ALTER TABLE production_plan_days
ADD CONSTRAINT production_plan_days_production_plan_id_fkey
FOREIGN KEY (production_plan_id)
REFERENCES production_plans(id)
ON DELETE CASCADE;
