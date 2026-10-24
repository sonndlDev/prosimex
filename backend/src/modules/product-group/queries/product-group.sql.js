/**
 * @file product-group.sql.js
 * Named SQL constants for the product-group read endpoints.
 *
 * Type C functions:
 *   - getProductGroupOperations: conditional SQL with correlated subqueries
 *   - getStageConfigs: multi-query aggregation
 *   - exportProductGroups: multi-table JOIN for export
 *
 * SQL kept exactly as found in the original controller — no rewrites.
 */

// ── getProductGroupOperations ────────────────────────────────────────────────

/**
 * Query used when order_id AND product_id are provided.
 * $1 = product_group_id, $2 = order_id, $3 = product_id
 */
export const SQL_PGO_WITH_CONTEXT = `
  SELECT pgo.*,
         o.name as operation_name,
         (SELECT string_agg(m.name, ', ') FROM machines m WHERE m.id = ANY(pgo.machine_ids)) as machine_names,
         EXISTS (
           SELECT 1 FROM production_plans pp
           WHERE pp.product_group_operation_id = pgo.id
             AND pp.order_id = $2
             AND pp.product_id = $3
             AND pp.deleted_at IS NULL
         ) as is_planned,
         COALESCE(
           (SELECT SUM(dti.actual_quantity)
            FROM daily_production_ticket_items dti
            JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
            WHERE dt.deleted_at IS NULL
              AND dti.order_id = $2
              AND dti.product_id = $3
              AND dti.product_group_operation_id = pgo.id),
           0
         )::numeric as total_actual,
         COALESCE(
           (SELECT op_qty.quantity
            FROM order_products op_qty
            WHERE op_qty.order_id = $2
              AND op_qty.product_id = $3
            LIMIT 1),
           0
         )::numeric as order_quantity
  FROM product_group_operations pgo
  LEFT JOIN operations o ON pgo.operation_id = o.id
  WHERE pgo.product_group_id = $1 AND pgo.deleted_at IS NULL
  ORDER BY pgo.sequence_order ASC
`;

/**
 * Query used when no order/product context is provided.
 * $1 = product_group_id
 */
export const SQL_PGO_BASE = `
  SELECT pgo.*,
         o.name as operation_name,
         (SELECT string_agg(m.name, ', ') FROM machines m WHERE m.id = ANY(pgo.machine_ids)) as machine_names,
         false as is_planned,
         0::numeric as total_actual,
         0::numeric as order_quantity
  FROM product_group_operations pgo
  LEFT JOIN operations o ON pgo.operation_id = o.id
  WHERE pgo.product_group_id = $1 AND pgo.deleted_at IS NULL
  ORDER BY pgo.sequence_order ASC
`;

/**
 * Extra query: manual production (product_group_operation_id IS NULL).
 * $1 = order_id, $2 = product_id
 */
export const SQL_PGO_NULL_OP_ACTUAL = `
  SELECT
    COALESCE(SUM(dti.actual_quantity), 0)::numeric as total_actual,
    COALESCE(
      (SELECT op_qty.quantity FROM order_products op_qty
       WHERE op_qty.order_id = $1 AND op_qty.product_id = $2 LIMIT 1),
      0
    )::numeric as order_quantity
  FROM daily_production_ticket_items dti
  JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
  WHERE dt.deleted_at IS NULL
    AND dti.order_id = $1
    AND dti.product_id = $2
    AND dti.product_group_operation_id IS NULL
`;

// ── getStageConfigs ──────────────────────────────────────────────────────────

/** $1 = product_group_id */
export const SQL_STAGE_CONFIGS = `
  SELECT psc.*, p.name as product_name
  FROM product_stage_configs psc
  JOIN products p ON psc.product_id = p.id AND p.deleted_at IS NULL
  WHERE psc.product_group_id = $1
  ORDER BY p.name ASC
`;

/** $1 = product_group_id */
export const SQL_STAGE_PRODUCTS = `
  SELECT p.id, p.name FROM products p
  WHERE p.product_group_id = $1 AND p.deleted_at IS NULL
  ORDER BY p.name ASC
`;

/** $1 = product_group_id */
export const SQL_STAGE_OPS_COUNT = `
  SELECT COUNT(*) FROM product_group_operations WHERE product_group_id = $1 AND deleted_at IS NULL
`;

// ── exportProductGroups ──────────────────────────────────────────────────────

/** Base for export — caller appends dynamic WHERE and ORDER BY. */
export const SQL_EXPORT_BASE = `
  SELECT pg.id, pg.name as group_name,
         p.id as product_id, p.name as product_name,
         COALESCE(psc.has_xi_ma, false) as has_xi_ma,
         COALESCE(psc.has_dong_goi, false) as has_dong_goi,
         pgo.sequence_order,
         o.name as operation_name,
         (SELECT string_agg(m.name, ', ') FROM machines m WHERE m.id = ANY(pgo.machine_ids)) as machine_names,
         pgo.dinh_muc,
         COALESCE(cu.full_name, cu.username) as creator_name,
         COALESCE(mu.full_name, mu.username) as modifier_name,
         pg.created_at, pg.updated_at
  FROM product_groups pg
  LEFT JOIN products p ON p.product_group_id = pg.id AND p.deleted_at IS NULL
  LEFT JOIN product_stage_configs psc ON psc.product_id = p.id AND psc.product_group_id = pg.id
  LEFT JOIN product_group_operations pgo ON pgo.product_group_id = pg.id AND pgo.deleted_at IS NULL
  LEFT JOIN operations o ON pgo.operation_id = o.id
  LEFT JOIN users cu ON pg.created_by = cu.id
  LEFT JOIN users mu ON pg.modified_by = mu.id
`;
