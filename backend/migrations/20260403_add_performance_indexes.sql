-- ==========================================
-- Performance Indexes Migration
-- 2026-04-03
-- ==========================================

-- production_plans: thường WHERE deleted_at IS NULL, JOIN order_id
CREATE INDEX IF NOT EXISTS idx_pp_order_id      ON production_plans(order_id);
CREATE INDEX IF NOT EXISTS idx_pp_deleted_at    ON production_plans(deleted_at);
CREATE INDEX IF NOT EXISTS idx_pp_status        ON production_plans(status);

-- production_plan_days: JOIN/WHERE production_plan_id rất thường xuyên
CREATE INDEX IF NOT EXISTS idx_ppd_plan_id      ON production_plan_days(production_plan_id);
CREATE INDEX IF NOT EXISTS idx_ppd_working_date ON production_plan_days(working_date);

-- worker_plan_assignments: WHERE plan_id AND working_date (correlated subquery)
CREATE INDEX IF NOT EXISTS idx_wpa_plan_date    ON worker_plan_assignments(production_plan_id, working_date);

-- orders: WHERE deleted_at, status, delivery_date
CREATE INDEX IF NOT EXISTS idx_orders_deleted_status  ON orders(deleted_at, status);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_date   ON orders(delivery_date);
CREATE INDEX IF NOT EXISTS idx_orders_factory         ON orders(factory_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer        ON orders(customer_id);

-- audit_logs: sẽ grow rất nhanh
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_id    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity     ON audit_logs(entity, entity_id);

-- daily_production_ticket_items
CREATE INDEX IF NOT EXISTS idx_dti_ticket_id    ON daily_production_ticket_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_dti_order_product ON daily_production_ticket_items(order_id, product_id);
CREATE INDEX IF NOT EXISTS idx_dti_pgo          ON daily_production_ticket_items(product_group_operation_id);

-- daily_production_tickets
CREATE INDEX IF NOT EXISTS idx_dt_deleted_at    ON daily_production_tickets(deleted_at);
CREATE INDEX IF NOT EXISTS idx_dt_ticket_date   ON daily_production_tickets(ticket_date);

-- machine_schedules
CREATE INDEX IF NOT EXISTS idx_ms_plan_id       ON machine_schedules(production_plan_id);
CREATE INDEX IF NOT EXISTS idx_ms_machine_dates ON machine_schedules(machine_id, start_date, end_date);

-- order_products
CREATE INDEX IF NOT EXISTS idx_op_order_product ON order_products(order_id, product_id);

-- outsourcing_tickets (dùng trong completion report)
CREATE INDEX IF NOT EXISTS idx_ot_order_product ON outsourcing_tickets(order_id, product_id, type);
