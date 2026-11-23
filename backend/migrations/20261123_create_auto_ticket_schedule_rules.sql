-- 20261123_create_auto_ticket_schedule_rules.sql
-- Quy tắc tùy chỉnh lịch tạo phiếu SX tự động (thay cho hằng số AUTO_TICKET_CONFIG).
--   OFF_RUN      : ngày run_date KHÔNG chạy job tạo phiếu (target_date = NULL)
--   EXTRA_TARGET : khi job chạy ở run_date, tạo thêm phiếu cho target_date

CREATE TABLE IF NOT EXISTS auto_ticket_schedule_rules (
    id SERIAL PRIMARY KEY,
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('OFF_RUN', 'EXTRA_TARGET')),
    run_date DATE NOT NULL,
    target_date DATE,
    note TEXT,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT auto_ticket_rule_target_chk CHECK (
        (rule_type = 'OFF_RUN' AND target_date IS NULL)
        OR (rule_type = 'EXTRA_TARGET' AND target_date IS NOT NULL)
    )
);

-- Chống trùng quy tắc đang hoạt động (target_date NULL được coi là 1970-01-01 cho OFF_RUN)
CREATE UNIQUE INDEX IF NOT EXISTS uq_auto_ticket_rules_active
    ON auto_ticket_schedule_rules (rule_type, run_date, COALESCE(target_date, DATE '1970-01-01'))
    WHERE deleted_at IS NULL;

-- Seed cấu hình hiện tại: không chạy ngày 24/11, chiều 23/11 tạo thêm phiếu cho 25/11
INSERT INTO auto_ticket_schedule_rules (rule_type, run_date, target_date, note)
VALUES
    ('OFF_RUN', DATE '2026-11-24', NULL, 'Không chạy job ngày 24/11 (đã tạo sớm từ 23/11)'),
    ('EXTRA_TARGET', DATE '2026-11-23', DATE '2026-11-25', 'Chạy 23/11 tạo thêm phiếu cho 25/11')
ON CONFLICT DO NOTHING;
