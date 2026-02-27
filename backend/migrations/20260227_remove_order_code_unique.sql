-- Migration: Remove unique constraint from order_code in orders table

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_order_code_key;
-- If the constraint has a different name, you may need to check with \d orders in psql
-- Or use: ALTER TABLE orders DROP CONSTRAINT IF EXISTS order_code_unique;
