-- 20261026_add_source_inventory_id_to_product_inventory.sql
-- Lien ket dong xuat kho voi lo nhap goc (de gom lich su xuat theo lo).
-- Dong xuat cu (truoc migration) co source_inventory_id = NULL va se giu nguyen hien thi.

ALTER TABLE product_inventory
  ADD COLUMN IF NOT EXISTS source_inventory_id INTEGER REFERENCES product_inventory(id);

CREATE INDEX IF NOT EXISTS idx_product_inventory_source_inventory_id
  ON product_inventory (source_inventory_id);

COMMENT ON COLUMN product_inventory.source_inventory_id IS 'Lo nhap goc ma dong xuat kho nay duoc tach ra';
