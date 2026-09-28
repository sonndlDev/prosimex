import pool from '../config/db.js';

export async function getProductsByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.product_group_id, pg.name AS product_group_name
     FROM products p
     LEFT JOIN product_groups pg ON p.product_group_id = pg.id
     WHERE p.id = ANY($1::int[])`,
    [[...new Set(ids)]]
  );
  return rows;
}

export function buildProductMap(products) {
  return Object.fromEntries(products.map(p => [p.id, p]));
}
