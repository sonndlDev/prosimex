import pool from '../config/db.js';

/**
 * Batch-fetch order_products cho nhiều (order_id, product_id) cùng lúc.
 * Trả về map keyed by `${order_id}_${product_id}`.
 */
export async function getOrderProductsMap(orderIds, productIds) {
  if (!orderIds || orderIds.length === 0) return {};
  const { rows } = await pool.query(
    `SELECT op.order_id, op.product_id, op.quantity, op.product_group_id,
            COALESCE(op.product_name, p.name)   AS product_name,
            pg.name                              AS product_group_name
     FROM order_products op
     LEFT JOIN products       p  ON op.product_id      = p.id
     LEFT JOIN product_groups pg ON COALESCE(op.product_group_id, p.product_group_id) = pg.id
     WHERE op.order_id = ANY($1::int[])
       AND op.product_id = ANY($2::int[])`,
    [[...new Set(orderIds)], [...new Set(productIds)]]
  );
  return Object.fromEntries(rows.map(r => [`${r.order_id}_${r.product_id}`, r]));
}
