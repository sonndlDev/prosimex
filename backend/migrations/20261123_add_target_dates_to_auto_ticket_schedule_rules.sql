-- 20261123_add_target_dates_to_auto_ticket_schedule_rules.sql
-- Cho quy tắc EXTRA_TARGET khai báo danh sách ngày tạo phiếu bất kỳ (không cần liền nhau),
-- ví dụ: {2026-11-24, 2026-11-25} hoặc {2026-11-26}.
-- Ngày bỏ qua job được hệ thống tự suy ra, không cần lưu.

ALTER TABLE auto_ticket_schedule_rules
    ADD COLUMN IF NOT EXISTS target_dates DATE[];

-- Chuyển dữ liệu cũ (target_date..target_date_end) sang danh sách
UPDATE auto_ticket_schedule_rules
   SET target_dates = ARRAY(
         SELECT CAST(d AS date)
           FROM generate_series(target_date, COALESCE(target_date_end, target_date), INTERVAL '1 day') AS d
       )
 WHERE rule_type = 'EXTRA_TARGET'
   AND target_date IS NOT NULL
   AND target_dates IS NULL;
