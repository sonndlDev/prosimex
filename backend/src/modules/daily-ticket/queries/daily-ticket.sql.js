/**
 * @file daily-ticket.sql.js
 * Named SQL constants for the daily-ticket module.
 * Type C: complex queries with GROUP BY aggregates, STRING_AGG, correlated subqueries.
 * SQL is kept exactly as in the original repository — no rewrites.
 */

/**
 * Base WHERE clause prefix used by both COUNT and LIST queries.
 * Caller appends dynamic filter segments.
 */
export const SQL_TICKETS_BASE_WHERE =
  `WHERE dt.deleted_at IS NULL AND (o.id IS NULL OR o.deleted_at IS NULL) AND (p.id IS NULL OR p.deleted_at IS NULL)`;

/**
 * COUNT query for paginated ticket list.
 * Requires a dynamic WHERE clause appended by the caller.
 * Uses DISTINCT dt.id because of the LEFT JOINs to ticket items.
 */
export const SQL_TICKETS_COUNT = `
  SELECT COUNT(DISTINCT dt.id)
  FROM daily_production_tickets dt
  LEFT JOIN daily_production_ticket_items dti ON dti.ticket_id = dt.id
  LEFT JOIN orders o ON dti.order_id = o.id
  LEFT JOIN products p ON dti.product_id = p.id
  LEFT JOIN product_group_operations pgo ON dti.product_group_operation_id = pgo.id
  LEFT JOIN operations op ON pgo.operation_id = op.id
  LEFT JOIN users cu ON dt.created_by = cu.id
`;

/**
 * LIST query for paginated ticket list.
 * Requires a dynamic WHERE clause + LIMIT/OFFSET appended by the caller.
 * Aggregates: STRING_AGG for order/product/operation names; SUM for quantities;
 * COALESCE subquery to resolve remaining_quantity from production_plans.
 */
export const SQL_TICKETS_LIST = `
  SELECT
    dt.id as id,
    dt.id as master_id,
    dt.status as ticket_status,
    dt.ticket_date,
    dt.is_manual,
    dt.created_by,
    dt.created_at,
    m.name as machine_name,
    f.name as factory_name,
    STRING_AGG(DISTINCT o.name, ', ') as order_name,
    STRING_AGG(DISTINCT o.po_customer, ', ') as po_customer,
    STRING_AGG(DISTINCT p.name, ', ') as product_name,
    STRING_AGG(DISTINCT op.name, ', ') as fallback_operation_name,
    STRING_AGG(DISTINCT dti.operation_name, ', ') as operation_name,
    SUM(dti.planned_quantity) as planned_quantity,
    SUM(dti.actual_quantity) as actual_quantity,
    STRING_AGG(DISTINCT dti.notes, '; ') as notes,
    STRING_AGG(DISTINCT dti.actual_notes, '; ') as actual_notes,
    COALESCE(
      MAX(pp.remaining_quantity),
      SUM(dti.planned_quantity) - SUM(dti.actual_quantity)
    ) as remaining_quantity,
    COALESCE(cu.full_name, cu.username, 'Hệ thống') as creator_name,
    COALESCE(mu.full_name, mu.username) as modifier_name
  FROM daily_production_tickets dt
  LEFT JOIN daily_production_ticket_items dti ON dti.ticket_id = dt.id
  LEFT JOIN orders o ON dti.order_id = o.id
  LEFT JOIN products p ON dti.product_id = p.id
  LEFT JOIN product_group_operations pgo ON dti.product_group_operation_id = pgo.id
  LEFT JOIN operations op ON pgo.operation_id = op.id
  LEFT JOIN machines m ON dt.machine_id = m.id
  LEFT JOIN factories f ON m.factory_id = f.id
  LEFT JOIN production_plans pp ON pp.id = COALESCE(
    dti.production_plan_id,
    (SELECT id FROM production_plans
     WHERE order_id = dti.order_id
       AND product_id = dti.product_id
       AND product_group_operation_id = dti.product_group_operation_id
       AND deleted_at IS NULL
     LIMIT 1)
  )
  LEFT JOIN users cu ON dt.created_by = cu.id
  LEFT JOIN users mu ON dt.modified_by = mu.id
`;

/** GROUP BY + ORDER BY clause appended after the WHERE clause in the list query. */
export const SQL_TICKETS_LIST_GROUP_ORDER = `
  GROUP BY
    dt.id, dt.status, dt.ticket_date, dt.is_manual, dt.created_by, dt.created_at, m.name, f.name,
    cu.full_name, cu.username, mu.full_name, mu.username
  ORDER BY dt.ticket_date DESC, dt.id DESC
`;

/**
 * Fetch a single ticket header by ID.
 * Joins machines + users for display names.
 */
export const SQL_TICKET_BY_ID = `
  SELECT dt.*, m.name as machine_name,
    COALESCE(cu.full_name, cu.username, 'Hệ thống') as creator_name,
    COALESCE(mu.full_name, mu.username) as modifier_name
  FROM daily_production_tickets dt
  LEFT JOIN machines m ON dt.machine_id = m.id
  LEFT JOIN users cu ON dt.created_by = cu.id
  LEFT JOIN users mu ON dt.modified_by = mu.id
  WHERE dt.id = $1 AND dt.deleted_at IS NULL
`;

/**
 * Fallback: look up ticket_id from an item ID.
 * Used when the provided ID is an item ID, not a ticket ID.
 */
export const SQL_TICKET_ID_FROM_ITEM = `
  SELECT ticket_id FROM daily_production_ticket_items WHERE id = $1
`;

/**
 * Fetch a single ticket header by ID (no machine join — fallback path).
 */
export const SQL_TICKET_BY_ID_NO_MACHINE = `
  SELECT dt.*,
    COALESCE(cu.full_name, cu.username, 'Hệ thống') as creator_name,
    COALESCE(mu.full_name, mu.username) as modifier_name
  FROM daily_production_tickets dt
  LEFT JOIN users cu ON dt.created_by = cu.id
  LEFT JOIN users mu ON dt.modified_by = mu.id
  WHERE dt.id = $1 AND dt.deleted_at IS NULL
`;

/**
 * Fetch all items for a ticket.
 * Correlated subquery on production_plans to resolve remaining_quantity / dinh_muc.
 */
export const SQL_TICKET_ITEMS_BY_TICKET_ID = `
  SELECT dti.*,
    o.order_code, o.name as order_name, o.po_customer,
    c.code as customer_code,
    c.name as customer_name,
    p.name as product_name,
    pg.name as product_group_name,
    op.name as pgo_operation_name,
    op.description as operation_note,
    m.name as pgo_machine_name,
    pp.remaining_quantity,
    COALESCE(pp.dinh_muc, pgo.dinh_muc) as dinh_muc
  FROM daily_production_ticket_items dti
  LEFT JOIN orders o ON dti.order_id = o.id
  LEFT JOIN customers c ON o.customer_id = c.id
  LEFT JOIN products p ON dti.product_id = p.id
  LEFT JOIN product_groups pg ON p.product_group_id = pg.id
  LEFT JOIN product_group_operations pgo ON dti.product_group_operation_id = pgo.id
  LEFT JOIN operations op ON pgo.operation_id = op.id
  LEFT JOIN machines m ON pgo.machine_id = m.id
  LEFT JOIN production_plans pp ON pp.id = COALESCE(
    dti.production_plan_id,
    (SELECT id FROM production_plans
     WHERE order_id = dti.order_id
       AND product_id = dti.product_id
       AND product_group_operation_id = dti.product_group_operation_id
       AND deleted_at IS NULL
     LIMIT 1)
  )
  WHERE dti.ticket_id = $1
`;
