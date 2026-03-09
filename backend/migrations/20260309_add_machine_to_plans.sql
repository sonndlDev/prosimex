-- Add machine_id to production_plans for manual/Case 2 assignment
ALTER TABLE production_plans ADD COLUMN IF NOT EXISTS machine_id INT REFERENCES machines(id);
ALTER TABLE production_plans ADD COLUMN IF NOT EXISTS factory_id INT REFERENCES factories(id);
ALTER TABLE production_plans ADD COLUMN IF NOT EXISTS dinh_muc NUMERIC(10, 2);
ALTER TABLE production_plans ADD COLUMN IF NOT EXISTS is_outsourced BOOLEAN DEFAULT FALSE;
