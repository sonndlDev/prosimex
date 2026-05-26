-- Optimizations for remaining hotspots (Production Planning days + Outsourcing getTicketByCode)
-- PostgreSQL 15 compatible

-- worker_plan_assignments already has (production_plan_id, working_date) index in earlier migrations.
-- NOTE: outsourcing indexes already exist in 20260526_optimize_orders_daily_outsourcing_indexes.sql
