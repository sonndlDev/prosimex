import pool from '../config/db.js';

export async function getDaysByPlanIds(planIds) {
  if (!planIds || planIds.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT ppd.production_plan_id,
            ppd.working_date,
            ppd.planned_work_quantity,
            ppd.is_overtime,
            (SELECT COUNT(*)
             FROM worker_plan_assignments wpa
             WHERE wpa.production_plan_id = ppd.production_plan_id
               AND wpa.working_date = ppd.working_date) AS worker_count,
            (SELECT string_agg(w.name, ', ')
             FROM worker_plan_assignments wpa
             JOIN workers w ON wpa.worker_id = w.id
             WHERE wpa.production_plan_id = ppd.production_plan_id
               AND wpa.working_date = ppd.working_date) AS worker_names
     FROM production_plan_days ppd
     WHERE ppd.production_plan_id = ANY($1::int[])
       AND ppd.deleted_at IS NULL
     ORDER BY ppd.working_date ASC`,
    [[...new Set(planIds)]]
  );
  return rows;
}

export function buildDaysMap(days) {
  return days.reduce((map, day) => {
    const pid = day.production_plan_id;
    if (!map[pid]) map[pid] = [];
    map[pid].push(day);
    return map;
  }, {});
}
