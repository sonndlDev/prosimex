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
    COALESCE(
      (SELECT SUM(pi2.quantity) FROM product_inventory pi2
       WHERE pi2.product_id = pi.product_id
          AND pi2.operation_id IS NOT DISTINCT FROM pi.operation_id
          AND pi2.inventory_type = pi.inventory_type
          AND pi2.completed_at IS NOT NULL
          AND pi2.deleted_at IS NULL
          AND pi2.recorded_at >= pi.recorded_at
          AND pi2.id != pi.id),
      0
    )::numeric as used_quantity
  FROM product_inventory pi
  JOIN products p ON pi.product_id = p.id AND p.deleted_at IS NULL
  LEFT JOIN operations o ON pi.operation_id = o.id AND o.deleted_at IS NULL
  LEFT JOIN users u ON pi.recorded_by = u.id
`;
