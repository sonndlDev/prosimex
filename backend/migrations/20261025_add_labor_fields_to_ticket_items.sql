-- 20261025_add_labor_fields_to_ticket_items.sql
-- Bo sung truong thoi gian va cong thuc te cho phieu SX

ALTER TABLE daily_production_ticket_items
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMP,
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMP,
  ADD COLUMN IF NOT EXISTS worker_count INTEGER,
  ADD COLUMN IF NOT EXISTS valid_work_minutes NUMERIC(10, 4),
  ADD COLUMN IF NOT EXISTS actual_labor NUMERIC(10, 4);

COMMENT ON COLUMN daily_production_ticket_items.start_time IS 'Thoi gian bat dau lam viec cua cong doan';
COMMENT ON COLUMN daily_production_ticket_items.end_time IS 'Thoi gian ket thuc lam viec cua cong doan';
COMMENT ON COLUMN daily_production_ticket_items.worker_count IS 'So nhan cong thuc hien cong doan';
COMMENT ON COLUMN daily_production_ticket_items.valid_work_minutes IS 'Phut lam viec hop le sau khi tru khoang nghi (11:30-13:00, 16:30-17:00)';
COMMENT ON COLUMN daily_production_ticket_items.actual_labor IS 'Cong thuc te = valid_work_minutes * worker_count / 480';
