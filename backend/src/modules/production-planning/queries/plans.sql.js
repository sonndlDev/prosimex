/**
 * Type C SQL queries for production-planning module.
 * Complex multi-table JOINs with sub-queries and batch-loaded days.
 * Called directly via db.query() in the service layer.
 */

export const SQL_COUNT_PLANS = `
  SELECT COUNT(DISTINCT pp.id)
  FROM production_plans pp
  LEFT JOIN orders o ON pp.order_id = o.id
`;

export const SQL_FIND_PLANS = `
  SELECT
    pp.*,
    o.order_code,
    o.name as order_name,
    o.po_customer,
    COALESCE(op_qty.quantity, o.quantity, 0) as quantity,
    COALESCE(op_qty.quantity, o.quantity, 0) as product_quantity,
    COALESCE(op_qty.product_name, p.name) as product_name,
    COALESCE(op_qty.product_group_name, pg.name) as product_group_name,
    pgo.sequence_order,
    COALESCE(pp.dinh_muc, pgo.dinh_muc) as dinh_muc,
    op.name as operation_name,
    op.description as operation_note,
    pp.machine_id as machine_id,
    m.name as machine_name,
    m.code as machine_code,
    f.name as factory_name,
    COALESCE(cu.full_name, cu.username) as creator_name,
    COALESCE(mu.full_name, mu.username) as modifier_name
  FROM production_plans pp
  LEFT JOIN orders o ON pp.order_id = o.id
  LEFT JOIN products p ON pp.product_id = p.id
  LEFT JOIN order_products op_qty ON op_qty.order_id = pp.order_id AND op_qty.product_id = pp.product_id
  LEFT JOIN product_groups pg ON pg.id = COALESCE(op_qty.product_group_id, p.product_group_id)
  LEFT JOIN product_group_operations pgo ON pp.product_group_operation_id = pgo.id
  LEFT JOIN operations op ON pgo.operation_id = op.id
  LEFT JOIN machines m ON pp.machine_id = m.id
  LEFT JOIN factories f ON pp.factory_id = f.id
  LEFT JOIN users cu ON pp.created_by = cu.id
  LEFT JOIN users mu ON pp.modified_by = mu.id
`;

export const SQL_FIND_PLAN_DAYS = `
  SELECT
    ppd.production_plan_id,
    ppd.working_date,
    ppd.planned_work_quantity,
    ppd.is_overtime,
    (SELECT COUNT(*) FROM worker_plan_assignments wpa
     WHERE wpa.production_plan_id = ppd.production_plan_id
     AND wpa.working_date = ppd.working_date) as worker_count,
    (SELECT string_agg(w.name, ', ') FROM worker_plan_assignments wpa
     JOIN workers w ON wpa.worker_id = w.id
     WHERE wpa.production_plan_id = ppd.production_plan_id
     AND wpa.working_date = ppd.working_date) as worker_names
  FROM production_plan_days ppd
  WHERE ppd.production_plan_id = ANY($1)
  AND ppd.deleted_at IS NULL
  ORDER BY ppd.working_date ASC
`;
