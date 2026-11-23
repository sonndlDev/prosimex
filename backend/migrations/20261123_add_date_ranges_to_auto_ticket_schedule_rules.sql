-- 20261123_add_date_ranges_to_auto_ticket_schedule_rules.sql
-- Cho phép một quy tắc áp dụng cho khoảng ngày thay vì một ngày.
--   run_date..run_date_end        : khoảng ngày chạy job (NULL end = một ngày)
--   target_date..target_date_end  : khoảng ngày tạo phiếu (chỉ EXTRA_TARGET, NULL end = một ngày)

ALTER TABLE auto_ticket_schedule_rules
    ADD COLUMN IF NOT EXISTS run_date_end DATE,
    ADD COLUMN IF NOT EXISTS target_date_end DATE;

ALTER TABLE auto_ticket_schedule_rules
    ADD CONSTRAINT auto_ticket_rule_run_range_chk
        CHECK (run_date_end IS NULL OR run_date_end >= run_date),
    ADD CONSTRAINT auto_ticket_rule_target_range_chk
        CHECK (target_date_end IS NULL OR target_date IS NULL OR target_date_end >= target_date);
