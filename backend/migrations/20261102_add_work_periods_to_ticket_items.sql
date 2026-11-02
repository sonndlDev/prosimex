-- 20261102_add_work_periods_to_ticket_items.sql
-- Ho tro nhieu khoang thoi gian lam viec cho 1 cong doan
-- (VD: 2 nguoi lam lech gio nhau: A 08:00-12:00, B 10:00-16:00)

ALTER TABLE daily_production_ticket_items
  ADD COLUMN IF NOT EXISTS work_periods JSONB;

COMMENT ON COLUMN daily_production_ticket_items.work_periods IS
  'Danh sach khoang lam viec: [{start:"HH:mm", end:"HH:mm", workers:int}]. NULL = che do don gian (start_time/end_time/worker_count). actual_labor = SUM(phut hop le moi khoang * workers) / 480';
