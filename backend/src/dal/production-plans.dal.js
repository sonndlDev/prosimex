import pool from '../config/db.js';

/**
 * Dùng cho ticket items: lấy plan data (remaining_quantity, dinh_muc) theo 2 cách:
 * 1. Theo direct production_plan_id
 * 2. Theo combo (order_id, product_id, pgo_id) cho các item không có plan_id
 */
export async function getPlanDataForItems(items) {
  if (!items || items.length === 0) return [];

  const directIds = [...new Set(
    items.filter(i => i.production_plan_id).map(i => i.production_plan_id)
  )];

  const comboItems = items.filter(i => !i.production_plan_id);
  const comboOrderIds  = [...new Set(comboItems.map(i => i.order_id).filter(Boolean))];
  const comboProductIds = [...new Set(comboItems.map(i => i.product_id).filter(Boolean))];

  const results = await Promise.all([
    directIds.length > 0
      ? pool.query(
          `SELECT id, order_id, product_id, product_group_operation_id,
                  remaining_quantity, dinh_muc
           FROM production_plans
           WHERE id = ANY($1::int[]) AND deleted_at IS NULL`,
          [directIds]
        )
      : { rows: [] },

    comboOrderIds.length > 0
      ? pool.query(
          `SELECT DISTINCT ON (order_id, product_id, product_group_operation_id)
                  id, order_id, product_id, product_group_operation_id,
                  remaining_quantity, dinh_muc
           FROM production_plans
           WHERE order_id   = ANY($1::int[])
             AND product_id = ANY($2::int[])
             AND deleted_at IS NULL
           ORDER BY order_id, product_id, product_group_operation_id, id ASC`,
          [comboOrderIds, comboProductIds]
        )
      : { rows: [] },
  ]);

  return [...results[0].rows, ...results[1].rows];
}

export function buildPlanIdMap(plans) {
  return Object.fromEntries(plans.map(p => [p.id, p]));
}

export function buildPlanComboMap(plans) {
  return Object.fromEntries(
    plans.map(p => [`${p.order_id}_${p.product_id}_${p.product_group_operation_id}`, p])
  );
}
