-- 20261123_add_status_to_auto_ticket_schedule_rules.sql
-- status     : ACTIVE = quy tắc được áp dụng, HIDE = lưu nhưng job bỏ qua
-- job_status : PENDING = đang chờ, RUNNING = job đang chạy, DONE = job đã chạy (do worker cập nhật)

ALTER TABLE auto_ticket_schedule_rules
    ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'HIDE')),
    ADD COLUMN IF NOT EXISTS job_status VARCHAR(10) NOT NULL DEFAULT 'PENDING'
        CHECK (job_status IN ('PENDING', 'RUNNING', 'DONE')),
    ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMP;
