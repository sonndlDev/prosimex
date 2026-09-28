import pool from '../config/db.js';

// product_group_operations — kèm operation name và machine name
export async function getPgosByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT pgo.id, pgo.sequence_order, pgo.dinh_muc,
            pgo.operation_id, pgo.machine_id, pgo.product_group_id,
            op.name  AS operation_name,
            op.description AS operation_note,
            m.name   AS machine_name,
            m.code   AS machine_code
     FROM product_group_operations pgo
     LEFT JOIN operations op ON pgo.operation_id = op.id
     LEFT JOIN machines   m  ON pgo.machine_id   = m.id
     WHERE pgo.id = ANY($1::int[])`,
    [[...new Set(ids)]]
  );
  return rows;
}

export function buildPgoMap(pgos) {
  return Object.fromEntries(pgos.map(p => [p.id, p]));
}
