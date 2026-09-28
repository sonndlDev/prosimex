import pool from '../config/db.js';

export async function getFactoriesByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT id, name FROM factories WHERE id = ANY($1::int[])`,
    [[...new Set(ids)]]
  );
  return rows;
}

export function buildFactoryMap(factories) {
  return Object.fromEntries(factories.map(f => [f.id, f]));
}
