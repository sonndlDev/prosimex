import pool from '../config/db.js';

export async function getOrdersByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT id, name, order_code, po_customer, quantity, customer_id, status
     FROM orders
     WHERE id = ANY($1::int[])`,
    [[...new Set(ids)]]
  );
  return rows;
}

export function buildOrderMap(orders) {
  return Object.fromEntries(orders.map(o => [o.id, o]));
}
