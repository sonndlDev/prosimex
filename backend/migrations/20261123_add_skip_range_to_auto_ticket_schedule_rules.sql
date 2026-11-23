-- 20261123_add_skip_range_to_auto_ticket_schedule_rules.sql
-- Cho quy tắc EXTRA_TARGET khai báo thêm khoảng ngày KHÔNG chạy job (gộp 2 quy tắc thành 1 bản ghi).
--   skip_run_date..skip_run_date_end : các ngày job bị bỏ qua khi quy tắc này đang Active (NULL = không có)

ALTER TABLE auto_ticket_schedule_rules
    ADD COLUMN IF NOT EXISTS skip_run_date DATE,
    ADD COLUMN IF NOT EXISTS skip_run_date_end DATE;

ALTER TABLE auto_ticket_schedule_rules
    ADD CONSTRAINT auto_ticket_rule_skip_only_extra_chk
        CHECK (skip_run_date IS NULL OR rule_type = 'EXTRA_TARGET'),
    ADD CONSTRAINT auto_ticket_rule_skip_range_chk
        CHECK (skip_run_date_end IS NULL OR skip_run_date IS NOT NULL),
    ADD CONSTRAINT auto_ticket_rule_skip_end_chk
        CHECK (skip_run_date_end IS NULL OR skip_run_date_end >= skip_run_date);
