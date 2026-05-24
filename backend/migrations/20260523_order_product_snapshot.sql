-- Snapshot mã hàng trên từng dòng đơn hàng (bảo vệ đơn cũ khi sửa dữ liệu gốc)

ALTER TABLE order_products
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS product_group_id INT,
  ADD COLUMN IF NOT EXISTS product_group_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS snapshot_at TIMESTAMP;

-- Backfill từ dữ liệu gốc hiện tại
UPDATE order_products op
SET
  product_name = p.name,
  product_group_id = p.product_group_id,
  product_group_name = pg.name,
  snapshot_at = COALESCE(op.snapshot_at, op.created_at, NOW())
FROM products p
LEFT JOIN product_groups pg ON pg.id = p.product_group_id AND pg.deleted_at IS NULL
WHERE op.product_id = p.id
  AND op.product_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_order_products_snapshot_at ON order_products(snapshot_at);
