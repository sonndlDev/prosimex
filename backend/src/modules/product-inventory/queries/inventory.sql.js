/**
 * @file inventory.sql.js
 * Named SQL constants for the product-inventory read endpoint.
 *
 * Type C: paginated list with a correlated subquery (used_quantity) and
 * multi-table JOINs — no natural batch key; SQL kept verbatim.
 */

/**
 * Count query — base fragment; caller appends the dynamic WHERE clause.
 * Used as: SQL_INVENTORY_COUNT_BASE + whereClause
 */
export const SQL_INVENTORY_COUNT_BASE = `
  SELECT COUNT(*)
  FROM product_inventory pi
  JOIN products p ON pi.product_id = p.id AND p.deleted_at IS NULL
  LEFT JOIN operations o ON pi.operation_id = o.id AND o.deleted_at IS NULL
`;

/**
 * Data query — base fragment; caller appends the dynamic WHERE clause
 * plus LIMIT/OFFSET placeholders.
 * Used as: SQL_INVENTORY_DATA_BASE + whereClause + ` ORDER BY ... LIMIT $N OFFSET $M`
 */
export const SQL_INVENTORY_DATA_BASE = `
  SELECT
    pi.*,
    p.name as product_name,
    o.name as operation_name,
    COALESCE(u.full_name, u.username) as recorder_name,
    (pi.quantity + ex.exported_quantity)::numeric as import_quantity,
    ex.exported_quantity::numeric as exported_quantity,
    ex.last_exported_at
  FROM product_inventory pi
  JOIN products p ON pi.product_id = p.id AND p.deleted_at IS NULL
  LEFT JOIN operations o ON pi.operation_id = o.id AND o.deleted_at IS NULL
  LEFT JOIN users u ON pi.recorded_by = u.id
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(SUM(e.quantity), 0) as exported_quantity,
      MAX(e.completed_at) as last_exported_at
    FROM product_inventory e
    WHERE e.source_inventory_id = pi.id
      AND e.deleted_at IS NULL
  ) ex ON TRUE
`;
