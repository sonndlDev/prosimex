import pool from '../config/db.js';

export async function getMachinesByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT id, name, code, factory_id
     FROM machines
     WHERE id = ANY($1::int[])`,
    [[...new Set(ids)]]
  );
  return rows;
}

export function buildMachineMap(machines) {
  return Object.fromEntries(machines.map(m => [m.id, m]));
}
