-- Migration: Add quantity to order_products for per-product quantity support
-- Also add factory_id and is_outsourced to production_plans for planning factory selection

-- 1. Add quantity column to order_products
ALTER TABLE order_products 
ADD COLUMN IF NOT EXISTS quantity NUMERIC(10, 2) DEFAULT 0;

-- 2. Add factory_id and is_outsourced to production_plans
ALTER TABLE production_plans 
ADD COLUMN IF NOT EXISTS factory_id INT REFERENCES factories(id);

ALTER TABLE production_plans 
ADD COLUMN IF NOT EXISTS is_outsourced BOOLEAN DEFAULT FALSE;
