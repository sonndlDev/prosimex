-- ==========================================
-- Optimize hot-path queries (Orders / Daily Tickets / Outsourcing)
-- PostgreSQL 15
-- 2026-05-26
-- ==========================================

-- NOTE:
-- Prefer partial indexes for soft-delete patterns.
-- Most queries filter `deleted_at IS NULL`.

-- --------------------------
-- Orders / order_products
-- --------------------------

-- Speed up order_products aggregation by order_id (products JSON, required quantities)
CREATE INDEX IF NOT EXISTS idx_order_products_order_id
  ON order_products(order_id);

-- Existing composite may exist; keep if already there.
CREATE INDEX IF NOT EXISTS idx_order_products_order_id_product_id
  ON order_products(order_id, product_id);

-- Speed up orders listing filters
CREATE INDEX IF NOT EXISTS idx_orders_factory_id_not_deleted
  ON orders(factory_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id_not_deleted
  ON orders(customer_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_status_not_deleted
  ON orders(status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_created_at_not_deleted
  ON orders(created_at DESC)
  WHERE deleted_at IS NULL;

-- --------------------------
-- Daily production tickets
-- --------------------------

CREATE INDEX IF NOT EXISTS idx_daily_production_tickets_not_deleted_date
  ON daily_production_tickets(ticket_date DESC)
  WHERE deleted_at IS NULL;

-- For sums by order_id when computing order completion
CREATE INDEX IF NOT EXISTS idx_dti_order_id
  ON daily_production_ticket_items(order_id);

-- Common join
CREATE INDEX IF NOT EXISTS idx_dti_ticket_id
  ON daily_production_ticket_items(ticket_id);

-- --------------------------
-- Outsourcing
-- --------------------------

-- Ticket list filters
CREATE INDEX IF NOT EXISTS idx_outsourcing_tickets_type_not_deleted
  ON outsourcing_tickets(type)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_outsourcing_tickets_supplier_id_not_deleted
  ON outsourcing_tickets(supplier_id)
  WHERE deleted_at IS NULL;

-- Aggregates by ticket and filters by order/product
CREATE INDEX IF NOT EXISTS idx_outsourcing_ticket_items_ticket_id
  ON outsourcing_ticket_items(ticket_id);

CREATE INDEX IF NOT EXISTS idx_outsourcing_ticket_items_order_id
  ON outsourcing_ticket_items(order_id);

CREATE INDEX IF NOT EXISTS idx_outsourcing_ticket_items_product_id
  ON outsourcing_ticket_items(product_id);

-- Returns aggregation per item
CREATE INDEX IF NOT EXISTS idx_outsourcing_returns_ticket_item_id
  ON outsourcing_returns(ticket_item_id);

CREATE INDEX IF NOT EXISTS idx_outsourcing_returns_ticket_item_id_returned_at
  ON outsourcing_returns(ticket_item_id, returned_at DESC);

-- --------------------------
-- Production plans (used as fallback lookup in daily tickets)
-- --------------------------

CREATE INDEX IF NOT EXISTS idx_production_plans_lookup_not_deleted
  ON production_plans(order_id, product_id, product_group_operation_id)
  WHERE deleted_at IS NULL;
