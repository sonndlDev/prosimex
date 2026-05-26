-- Migration: Add Multi-Product Support for Orders and Production Plans

-- 1. Create order_products table for Many-to-Many relationship
CREATE TABLE IF NOT EXISTS order_products (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (order_id, product_id)
);

-- 2. Add product_id to production_plans to specify which product is being planned
ALTER TABLE production_plans 
ADD COLUMN IF NOT EXISTS product_id INT REFERENCES products(id);

-- Optional: If there's existing data, you might want to backfill it
-- UPDATE production_plans pp SET product_id = (SELECT product_id FROM orders o WHERE o.id = pp.order_id) WHERE pp.product_id IS NULL;
