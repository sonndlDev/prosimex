-- Optimize product group operations lookups
-- PostgreSQL 15
-- 2026-05-26

-- Speed up getProductGroupOperations (filter by group_id + soft-delete)
CREATE INDEX IF NOT EXISTS idx_pgo_group_id_not_deleted
  ON product_group_operations(product_group_id)
  WHERE deleted_at IS NULL;

-- Speed up getProductGroups list (filter by factory_id + soft-delete)
CREATE INDEX IF NOT EXISTS idx_product_groups_factory_id_not_deleted
  ON product_groups(factory_id)
  WHERE deleted_at IS NULL;
