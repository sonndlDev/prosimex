/**
 * @file order.sql.js
 * Named SQL constants for the order module.
 * Type C: all read queries use CTEs, window functions, correlated subqueries,
 *         or complex aggregations — not suitable for a simple DAL.
 * SQL is kept exactly as in the original repository — no rewrites.
 */

import { ORDER_PRODUCT_JSON_FIELDS } from '../../../utils/order-product-snapshot.util.js';

/**
 * Base WHERE prefix for order list and count queries.
 * Caller appends dynamic filter segments.
 */
export const SQL_ORDERS_BASE_WHERE = `WHERE o.deleted_at IS NULL`;

/**
 * COUNT query for paginated order list.
 * Joins customers + order_ext for filter support.
 * Dynamic WHERE clause appended by caller.
 */
export const SQL_ORDERS_COUNT = `
  SELECT COUNT(*)
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.id AND c.deleted_at IS NULL
  LEFT JOIN order_ext oe ON o.id = oe.order_id
`;

/**
 * LIST query for paginated order list.
 * Uses 5 CTEs to compute per-product actuals + per-order completion percentage.
 * Dynamic WHERE clause + LIMIT/OFFSET appended by caller.
 */
export const SQL_ORDERS_LIST = `
  WITH product_stage_data AS (
    SELECT
      op.order_id,
      op.product_id,
      op.quantity as required,
      COALESCE(op.product_group_id, p_active.product_group_id) as effective_group_id,
      COALESCE(ss.has_xi_ma, psc.has_xi_ma, FALSE) as has_xi_ma,
      COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) as has_dong_goi,
      CASE
        WHEN COALESCE(ss.has_xi_ma, psc.has_xi_ma, FALSE) AND COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) THEN 4
        WHEN COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) THEN 2
        ELSE 0
      END as stage_count,
      COALESCE(ss.final_pgo_id, (
        SELECT pgo.id FROM product_group_operations pgo
        WHERE pgo.product_group_id = COALESCE(op.product_group_id, p_active.product_group_id)
        AND pgo.deleted_at IS NULL
        ORDER BY pgo.sequence_order DESC LIMIT 1
      ), NULL) as final_pgo_id
    FROM order_products op
    JOIN products p_active ON op.product_id = p_active.id AND p_active.deleted_at IS NULL
    LEFT JOIN product_stage_configs psc ON psc.product_id = op.product_id
      AND psc.product_group_id = COALESCE(op.product_group_id, p_active.product_group_id)
    LEFT JOIN order_product_snapshots ss ON ss.order_id = op.order_id AND ss.product_id = op.product_id
  ),
  product_actuals AS (
    SELECT
      psd.order_id,
      psd.product_id,
      psd.required,
      psd.stage_count,
      psd.has_xi_ma,
      psd.has_dong_goi,
      CASE WHEN psd.has_xi_ma THEN
        COALESCE((
          SELECT SUM(oti.quantity_out) FROM outsourcing_tickets ot
          JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
          WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
          AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
        ), 0)::numeric ELSE 0 END as xi_ma_di,
      CASE WHEN psd.has_xi_ma THEN
        COALESCE((
          SELECT SUM(or_t.quantity_returned) FROM outsourcing_returns or_t
          JOIN outsourcing_ticket_items oti ON or_t.ticket_item_id = oti.id
          JOIN outsourcing_tickets ot ON oti.ticket_id = ot.id
          WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
          AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
        ), 0)::numeric ELSE 0 END as xi_ma_ve,
      CASE WHEN psd.has_dong_goi THEN
        COALESCE((
          SELECT SUM(oti.quantity_out) FROM outsourcing_tickets ot
          JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
          WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
          AND ot.type = 'PACKAGING' AND ot.deleted_at IS NULL
        ), 0)::numeric ELSE 0 END as dong_goi,
      COALESCE((
        SELECT SUM(dti.actual_quantity) FROM daily_production_ticket_items dti
        JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
        WHERE dti.order_id = psd.order_id AND dti.product_id = psd.product_id
        AND dt.deleted_at IS NULL
        AND (psd.final_pgo_id IS NULL OR dti.product_group_operation_id = psd.final_pgo_id)
      ), 0)::numeric as sx
    FROM product_stage_data psd
  ),
  product_percentages AS (
    SELECT
      pa.order_id,
      pa.product_id,
      pa.required,
      pa.stage_count,
      CASE
        WHEN pa.stage_count = 4 THEN
          ROUND((LEAST(pa.xi_ma_di, pa.required) * 100.0 / NULLIF(pa.required, 0)
           + LEAST(pa.xi_ma_ve, pa.required) * 100.0 / NULLIF(pa.required, 0)
           + LEAST(pa.dong_goi, pa.required) * 100.0 / NULLIF(pa.required, 0)
           + LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0)) / 4.0, 2)
        WHEN pa.stage_count = 2 THEN
          ROUND((LEAST(pa.dong_goi, pa.required) * 100.0 / NULLIF(pa.required, 0)
           + LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0)) / 2.0, 2)
        WHEN pa.stage_count = 0 AND pa.required > 0 THEN
          ROUND(LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0), 2)
        ELSE 0
      END as product_percentage
    FROM product_actuals pa
  ),
  order_completion AS (
    SELECT
      order_id,
      ROUND(SUM(product_percentage) / COUNT(*), 2) as completion_percentage
    FROM product_percentages
    GROUP BY order_id
  )
  SELECT o.*, c.name as customer_name,
    COALESCE(cu.full_name, cu.username) as creator_name,
    COALESCE(mu.full_name, mu.username) as modifier_name,
    oe.production_start_date, oe.expected_shipping_date, oe.expected_container_shipping_date,
    oe.customer_confirmation_result, oe.expected_material_date, oe.actual_material_date,
    oe.net_weight_text, oe.package_count_text, oe.container_volume_text,
    oe.pallet_info, oe.accessory_status, oe.packaging_spec,
    COALESCE(oc.completion_percentage, 0) as completion_percentage,
    COALESCE(
      (SELECT json_agg(json_build_object(${ORDER_PRODUCT_JSON_FIELDS}))
       FROM order_products op
       JOIN products p ON op.product_id = p.id AND p.deleted_at IS NULL
       LEFT JOIN product_groups pg_snap ON pg_snap.id = op.product_group_id AND pg_snap.deleted_at IS NULL
       LEFT JOIN product_groups pg_live ON pg_live.id = p.product_group_id AND pg_live.deleted_at IS NULL
       WHERE op.order_id = o.id),
      '[]'
    ) as products
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.id AND c.deleted_at IS NULL
  LEFT JOIN users cu ON o.created_by = cu.id
  LEFT JOIN users mu ON o.modified_by = mu.id
  LEFT JOIN order_ext oe ON o.id = oe.order_id
  LEFT JOIN order_completion oc ON o.id = oc.order_id
`;

/** ORDER BY clause for list query (appended after WHERE). */
export const SQL_ORDERS_LIST_ORDER = `
  ORDER BY
    CASE
      WHEN regexp_replace(o.po_auto_code, '[^\\d]', '', 'g') != ''
      THEN CAST(regexp_replace(o.po_auto_code, '[^\\d]', '', 'g') AS INTEGER)
      ELSE NULL
    END DESC NULLS LAST,
    o.created_at DESC
`;

/**
 * Fetch a single order by ID.
 * Same 5-CTE structure as the list query — parameterized by order ID.
 */
export const SQL_ORDER_BY_ID = `
  WITH product_stage_data AS (
    SELECT
      op.order_id,
      op.product_id,
      op.quantity as required,
      COALESCE(op.product_group_id, p_active.product_group_id) as effective_group_id,
      COALESCE(ss.has_xi_ma, psc.has_xi_ma, FALSE) as has_xi_ma,
      COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) as has_dong_goi,
      CASE
        WHEN COALESCE(ss.has_xi_ma, psc.has_xi_ma, FALSE) AND COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) THEN 4
        WHEN COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) THEN 2
        ELSE 0
      END as stage_count,
      COALESCE(ss.final_pgo_id, (
        SELECT pgo.id FROM product_group_operations pgo
        WHERE pgo.product_group_id = COALESCE(op.product_group_id, p_active.product_group_id)
        AND pgo.deleted_at IS NULL
        ORDER BY pgo.sequence_order DESC LIMIT 1
      ), NULL) as final_pgo_id
    FROM order_products op
    JOIN products p_active ON op.product_id = p_active.id AND p_active.deleted_at IS NULL
    LEFT JOIN product_stage_configs psc ON psc.product_id = op.product_id
      AND psc.product_group_id = COALESCE(op.product_group_id, p_active.product_group_id)
    LEFT JOIN order_product_snapshots ss ON ss.order_id = op.order_id AND ss.product_id = op.product_id
    WHERE op.order_id = $1
  ),
  product_actuals AS (
    SELECT
      psd.order_id,
      psd.product_id,
      psd.required,
      psd.stage_count,
      psd.has_xi_ma,
      psd.has_dong_goi,
      CASE WHEN psd.has_xi_ma THEN
        COALESCE((
          SELECT SUM(oti.quantity_out) FROM outsourcing_tickets ot
          JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
          WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
          AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
        ), 0)::numeric ELSE 0 END as xi_ma_di,
      CASE WHEN psd.has_xi_ma THEN
        COALESCE((
          SELECT SUM(or_t.quantity_returned) FROM outsourcing_returns or_t
          JOIN outsourcing_ticket_items oti ON or_t.ticket_item_id = oti.id
          JOIN outsourcing_tickets ot ON oti.ticket_id = ot.id
          WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
          AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
        ), 0)::numeric ELSE 0 END as xi_ma_ve,
      CASE WHEN psd.has_dong_goi THEN
        COALESCE((
          SELECT SUM(oti.quantity_out) FROM outsourcing_tickets ot
          JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
          WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
          AND ot.type = 'PACKAGING' AND ot.deleted_at IS NULL
        ), 0)::numeric ELSE 0 END as dong_goi,
      COALESCE((
        SELECT SUM(dti.actual_quantity) FROM daily_production_ticket_items dti
        JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
        WHERE dti.order_id = psd.order_id AND dti.product_id = psd.product_id
        AND dt.deleted_at IS NULL
        AND (psd.final_pgo_id IS NULL OR dti.product_group_operation_id = psd.final_pgo_id)
      ), 0)::numeric as sx
    FROM product_stage_data psd
  ),
  product_percentages AS (
    SELECT
      pa.order_id,
      pa.product_id,
      pa.required,
      pa.stage_count,
      CASE
        WHEN pa.stage_count = 4 THEN
          ROUND((LEAST(pa.xi_ma_di, pa.required) * 100.0 / NULLIF(pa.required, 0)
           + LEAST(pa.xi_ma_ve, pa.required) * 100.0 / NULLIF(pa.required, 0)
           + LEAST(pa.dong_goi, pa.required) * 100.0 / NULLIF(pa.required, 0)
           + LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0)) / 4.0, 2)
        WHEN pa.stage_count = 2 THEN
          ROUND((LEAST(pa.dong_goi, pa.required) * 100.0 / NULLIF(pa.required, 0)
           + LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0)) / 2.0, 2)
        WHEN pa.stage_count = 0 AND pa.required > 0 THEN
          ROUND(LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0), 2)
        ELSE 0
      END as product_percentage
    FROM product_actuals pa
  ),
  order_completion AS (
    SELECT
      order_id,
      ROUND(SUM(product_percentage) / COUNT(*), 2) as completion_percentage
    FROM product_percentages
    GROUP BY order_id
  )
  SELECT o.*, c.name as customer_name,
    COALESCE(cu.full_name, cu.username) as creator_name,
    COALESCE(mu.full_name, mu.username) as modifier_name,
    oe.production_start_date, oe.expected_shipping_date, oe.expected_container_shipping_date,
    oe.customer_confirmation_result, oe.expected_material_date, oe.actual_material_date,
    oe.net_weight_text, oe.package_count_text, oe.container_volume_text,
    oe.pallet_info, oe.accessory_status, oe.packaging_spec,
    COALESCE(oc.completion_percentage, 0) as completion_percentage,
    COALESCE(
      (SELECT json_agg(json_build_object(${ORDER_PRODUCT_JSON_FIELDS}))
       FROM order_products op
       JOIN products p ON op.product_id = p.id AND p.deleted_at IS NULL
       LEFT JOIN product_groups pg_snap ON pg_snap.id = op.product_group_id AND pg_snap.deleted_at IS NULL
       LEFT JOIN product_groups pg_live ON pg_live.id = p.product_group_id AND pg_live.deleted_at IS NULL
       WHERE op.order_id = o.id),
      '[]'
    ) as products
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.id AND c.deleted_at IS NULL
  LEFT JOIN users cu ON o.created_by = cu.id
  LEFT JOIN users mu ON o.modified_by = mu.id
  LEFT JOIN order_ext oe ON o.id = oe.order_id
  LEFT JOIN order_completion oc ON o.id = oc.order_id
  WHERE o.id = $1 AND o.deleted_at IS NULL
`;

/** Lookup order status by ID (used by completion report to choose live vs done path). */
export const SQL_ORDER_STATUS_BY_ID = `
  SELECT status FROM orders WHERE id = $1 AND deleted_at IS NULL
`;

/**
 * Completion report — "DONE" path.
 * Uses order_product_snapshots for stage configuration.
 * Multi-CTE: inhouse_totals, sx_totals, plating_totals, plating_returns, packaging_totals.
 */
export const SQL_COMPLETION_REPORT_DONE = `
  WITH product_stages AS (
    SELECT
      ss.product_id,
      ss.total_stages,
      ss.final_pgo_id,
      ss.has_xi_ma,
      ss.has_dong_goi,
      ss.stage_count
    FROM order_product_snapshots ss
    WHERE ss.order_id = $1
  ),
  inhouse_totals AS (
    SELECT dti.product_id, dti.product_group_operation_id, SUM(dti.actual_quantity) as qty
    FROM daily_production_ticket_items dti
    JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
    WHERE dti.order_id = $1 AND dt.deleted_at IS NULL
    GROUP BY dti.product_id, dti.product_group_operation_id
  ),
  sx_totals AS (
    SELECT it.product_id, SUM(it.qty) as total_sx
    FROM inhouse_totals it
    JOIN product_stages ps ON ps.product_id = it.product_id
    WHERE ps.final_pgo_id IS NULL OR ps.final_pgo_id = it.product_group_operation_id
    GROUP BY it.product_id
  ),
  plating_totals AS (
    SELECT oti.product_id, SUM(oti.quantity_out) as total_plating_out
    FROM outsourcing_tickets ot
    JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
    WHERE oti.order_id = $1 AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
    GROUP BY oti.product_id
  ),
  plating_returns AS (
    SELECT oti.product_id, SUM(or_t.quantity_returned) as total_plating_returned
    FROM outsourcing_returns or_t
    JOIN outsourcing_ticket_items oti ON or_t.ticket_item_id = oti.id
    JOIN outsourcing_tickets ot ON oti.ticket_id = ot.id
    WHERE oti.order_id = $1 AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
    GROUP BY oti.product_id
  ),
  packaging_totals AS (
    SELECT oti.product_id, SUM(oti.quantity_out) as total_packaging_out
    FROM outsourcing_tickets ot
    JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
    WHERE oti.order_id = $1 AND ot.type = 'PACKAGING' AND ot.deleted_at IS NULL
    GROUP BY oti.product_id
  )
  SELECT
    p.id as product_id,
    COALESCE(op.product_name, p.name) as product_code,
    op.quantity as required_quantity,
    ps.total_stages,
    ps.stage_count,
    ps.has_xi_ma,
    ps.has_dong_goi,
    COALESCE(st.total_sx, 0) as sx_quantity,
    COALESCE(pt.total_plating_out, 0) as plating_out_quantity,
    COALESCE(pr.total_plating_returned, 0) as plating_returned_quantity,
    COALESCE(pkt.total_packaging_out, 0) as packaging_out_quantity,
    (SELECT COALESCE(SUM(pp2.inventory_input), 0) FROM production_plans pp2
     WHERE pp2.order_id = $1 AND pp2.product_id = p.id AND pp2.deleted_at IS NULL
     AND (ps.final_pgo_id IS NULL OR pp2.product_group_operation_id = ps.final_pgo_id)) as inventory_input,
    (
      SELECT json_agg(json_build_object(
        'operation_name', snap_op->>'operation_name',
        'actual_quantity', CASE
          WHEN snap_op->>'operation_name' ILIKE '%ĐI MẠ%' OR snap_op->>'operation_name' ILIKE '%ĐI XI%' THEN COALESCE(pt.total_plating_out, 0)
          WHEN snap_op->>'operation_name' ILIKE '%VỀ MẠ%' OR snap_op->>'operation_name' ILIKE '%XI MẠ VỀ%' OR snap_op->>'operation_name' ILIKE '%VỀ XI%' THEN COALESCE(pr.total_plating_returned, 0)
          WHEN snap_op->>'operation_name' ILIKE '%ĐÓNG GÓI%' OR snap_op->>'operation_name' ILIKE '%ĐONG GOI%' THEN COALESCE(pkt.total_packaging_out, 0)
          ELSE COALESCE((SELECT ih.qty FROM inhouse_totals ih WHERE ih.product_group_operation_id = (snap_op->>'pgo_id')::int AND ih.product_id = p.id), 0)
        END,
        'configured', true
      ) ORDER BY (snap_op->>'sequence_order')::int ASC)
      FROM jsonb_array_elements(ss.operations_json) AS snap_op
    ) as operations_detail
  FROM order_products op
  JOIN products p ON op.product_id = p.id
  JOIN product_stages ps ON p.id = ps.product_id
  JOIN order_product_snapshots ss ON ss.order_id = op.order_id AND ss.product_id = op.product_id
  LEFT JOIN sx_totals st ON p.id = st.product_id
  LEFT JOIN plating_totals pt ON p.id = pt.product_id
  LEFT JOIN plating_returns pr ON p.id = pr.product_id
  LEFT JOIN packaging_totals pkt ON p.id = pkt.product_id
  WHERE op.order_id = $1
`;

/**
 * Completion report — "LIVE" path (order still in progress).
 * Derives stage config from live product_stage_configs table instead of snapshots.
 * Multi-CTE: same inhouse/sx/plating/packaging structure as the DONE path.
 */
export const SQL_COMPLETION_REPORT_LIVE = `
  WITH product_stages AS (
    SELECT
      op.product_id,
      COALESCE(op.product_group_id, p.product_group_id) AS effective_group_id,
      (SELECT COUNT(*) FROM product_group_operations pgo
       WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id) AND pgo.deleted_at IS NULL) as total_stages,
      (SELECT pgo.id FROM product_group_operations pgo
       WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id) AND pgo.deleted_at IS NULL
       ORDER BY pgo.sequence_order DESC LIMIT 1) as final_pgo_id,
      COALESCE(psc.has_xi_ma, FALSE) as has_xi_ma,
      COALESCE(psc.has_dong_goi, FALSE) as has_dong_goi,
      CASE
        WHEN COALESCE(psc.has_xi_ma, FALSE) AND COALESCE(psc.has_dong_goi, FALSE) THEN 4
        WHEN COALESCE(psc.has_dong_goi, FALSE) THEN 2
        ELSE 0
      END as stage_count
    FROM order_products op
    JOIN products p ON op.product_id = p.id
    LEFT JOIN product_stage_configs psc ON psc.product_id = op.product_id
      AND psc.product_group_id = COALESCE(op.product_group_id, p.product_group_id)
    WHERE op.order_id = $1
  ),
  inhouse_totals AS (
    SELECT dti.product_id, dti.product_group_operation_id, SUM(dti.actual_quantity) as qty
    FROM daily_production_ticket_items dti
    JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
    WHERE dti.order_id = $1 AND dt.deleted_at IS NULL
    GROUP BY dti.product_id, dti.product_group_operation_id
  ),
  sx_totals AS (
    SELECT it.product_id, SUM(it.qty) as total_sx
    FROM inhouse_totals it
    JOIN product_stages ps ON ps.product_id = it.product_id
    WHERE ps.final_pgo_id IS NULL OR ps.final_pgo_id = it.product_group_operation_id
    GROUP BY it.product_id
  ),
  plating_totals AS (
    SELECT oti.product_id, SUM(oti.quantity_out) as total_plating_out
    FROM outsourcing_tickets ot
    JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
    WHERE oti.order_id = $1 AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
    GROUP BY oti.product_id
  ),
  plating_returns AS (
    SELECT oti.product_id, SUM(or_t.quantity_returned) as total_plating_returned
    FROM outsourcing_returns or_t
    JOIN outsourcing_ticket_items oti ON or_t.ticket_item_id = oti.id
    JOIN outsourcing_tickets ot ON oti.ticket_id = ot.id
    WHERE oti.order_id = $1 AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
    GROUP BY oti.product_id
  ),
  packaging_totals AS (
    SELECT oti.product_id, SUM(oti.quantity_out) as total_packaging_out
    FROM outsourcing_tickets ot
    JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
    WHERE oti.order_id = $1 AND ot.type = 'PACKAGING' AND ot.deleted_at IS NULL
    GROUP BY oti.product_id
  )
  SELECT
    p.id as product_id,
    COALESCE(op.product_name, p.name) as product_code,
    op.quantity as required_quantity,
    ps.total_stages,
    ps.stage_count,
    ps.has_xi_ma,
    ps.has_dong_goi,
    COALESCE(st.total_sx, 0) as sx_quantity,
    COALESCE(pt.total_plating_out, 0) as plating_out_quantity,
    COALESCE(pr.total_plating_returned, 0) as plating_returned_quantity,
    COALESCE(pkt.total_packaging_out, 0) as packaging_out_quantity,
    (SELECT COALESCE(SUM(pp2.inventory_input), 0) FROM production_plans pp2
     WHERE pp2.order_id = $1 AND pp2.product_id = p.id AND pp2.deleted_at IS NULL
     AND (ps.final_pgo_id IS NULL OR pp2.product_group_operation_id = ps.final_pgo_id)) as inventory_input,
    (
      SELECT json_agg(json_build_object(
        'operation_name', op_name.name,
        'actual_quantity', CASE
          WHEN op_name.name ILIKE '%ĐI MẠ%' OR op_name.name ILIKE '%ĐI XI%' THEN COALESCE(pt.total_plating_out, 0)
          WHEN op_name.name ILIKE '%VỀ MẠ%' OR op_name.name ILIKE '%XI MẠ VỀ%' OR op_name.name ILIKE '%VỀ XI%' THEN COALESCE(pr.total_plating_returned, 0)
          WHEN op_name.name ILIKE '%ĐÓNG GÓI%' OR op_name.name ILIKE '%ĐONG GOI%' THEN COALESCE(pkt.total_packaging_out, 0)
          ELSE COALESCE(ih.qty, 0)
        END,
        'configured', CASE WHEN pgo.id IS NOT NULL THEN true ELSE false END
      ) ORDER BY pgo.sequence_order ASC, op_name.name ASC)
      FROM operations op_name
      LEFT JOIN product_group_operations pgo ON pgo.operation_id = op_name.id
        AND pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id)
        AND pgo.deleted_at IS NULL
      LEFT JOIN inhouse_totals ih ON ih.product_group_operation_id = pgo.id AND ih.product_id = p.id
      WHERE op_name.deleted_at IS NULL
    ) as operations_detail
  FROM order_products op
  JOIN products p ON op.product_id = p.id
  JOIN product_stages ps ON p.id = ps.product_id
  LEFT JOIN sx_totals st ON p.id = st.product_id
  LEFT JOIN plating_totals pt ON p.id = pt.product_id
  LEFT JOIN plating_returns pr ON p.id = pr.product_id
  LEFT JOIN packaging_totals pkt ON p.id = pkt.product_id
  WHERE op.order_id = $1
`;

/**
 * Count query for product snapshots (used with dynamic WHERE).
 */
export const SQL_PRODUCT_SNAPSHOTS_COUNT = `
  SELECT COUNT(*)
  FROM order_products op
  JOIN orders o ON o.id = op.order_id
  JOIN products p ON p.id = op.product_id AND p.deleted_at IS NULL
`;

/**
 * Data query for product snapshots (used with dynamic WHERE + LIMIT/OFFSET).
 */
export const SQL_PRODUCT_SNAPSHOTS_LIST = `
  SELECT
    (op.order_id::text || '-' || op.product_id::text) AS id,
    op.order_id,
    op.product_id,
    op.quantity,
    op.product_name AS snapshot_product_name,
    op.product_group_id AS snapshot_product_group_id,
    op.product_group_name AS snapshot_product_group_name,
    op.snapshot_at,
    p.name AS current_product_name,
    p.product_group_id AS current_product_group_id,
    pg_live.name AS current_product_group_name,
    o.order_code,
    o.name AS order_name,
    o.status AS order_status,
    c.name AS customer_name,
    (op.product_name IS NOT NULL AND p.name IS DISTINCT FROM op.product_name)
      OR (op.product_group_id IS NOT NULL AND p.product_group_id IS DISTINCT FROM op.product_group_id)
      AS has_master_drift
  FROM order_products op
  JOIN orders o ON o.id = op.order_id
  JOIN products p ON p.id = op.product_id AND p.deleted_at IS NULL
  LEFT JOIN product_groups pg_live ON pg_live.id = p.product_group_id AND pg_live.deleted_at IS NULL
  LEFT JOIN customers c ON c.id = o.customer_id AND c.deleted_at IS NULL
`;

/** ORDER BY for product snapshots list. */
export const SQL_PRODUCT_SNAPSHOTS_ORDER = `
  ORDER BY op.snapshot_at DESC NULLS LAST, o.order_code ASC, op.product_id ASC
`;

/**
 * Tong hop cong ke hoach va cong thuc te theo don hang.
 * planned_labor = SUM(production_plans.total_required_work) / 8
 * actual_labor  = SUM(daily_production_ticket_items.actual_labor) — khong tinh phieu REJECTED
 * $1 = order_id
 */
export const SQL_ORDER_LABOR_SUMMARY = `
  WITH planned AS (
    SELECT COALESCE(SUM(pp.total_required_work), 0) / 8.0 AS planned_labor
    FROM production_plans pp
    WHERE pp.order_id = $1 AND pp.deleted_at IS NULL
  ),
  actual AS (
    SELECT COALESCE(SUM(dti.actual_labor), 0) AS actual_labor
    FROM daily_production_ticket_items dti
    JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
    WHERE dti.order_id = $1
      AND dt.deleted_at IS NULL
      AND (dt.status IS NULL OR dt.status != 'REJECTED')
  )
  SELECT
    planned.planned_labor,
    actual.actual_labor,
    actual.actual_labor - planned.planned_labor AS labor_diff,
    CASE
      WHEN planned.planned_labor = 0 THEN NULL
      ELSE ROUND(
        ((actual.actual_labor - planned.planned_labor) / planned.planned_labor * 100)::numeric, 2
      )
    END AS labor_diff_pct
  FROM planned, actual
`;
