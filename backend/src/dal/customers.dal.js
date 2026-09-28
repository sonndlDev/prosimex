import pool from '../config/db.js';

export async function getCustomersByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT id, name, code FROM customers WHERE id = ANY($1::int[])`,
    [[...new Set(ids)]]
  );
  return rows;
}

export function buildCustomerMap(customers) {
  return Object.fromEntries(customers.map(c => [c.id, c]));
}
