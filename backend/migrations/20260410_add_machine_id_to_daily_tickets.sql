-- 20260410_add_machine_id_to_daily_tickets.sql
-- Thêm machine_id và is_auto_generated vào daily_production_tickets
-- Phục vụ worker tự động lập phiếu sản xuất hàng ngày

ALTER TABLE daily_production_tickets
  ADD COLUMN IF NOT EXISTS machine_id INT REFERENCES machines(id),
  ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT FALSE;
