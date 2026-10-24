/**
 * @file machine-schedule.service.js
 * Business logic for the machine-schedule module.
 *
 * Type C: Complex, no pagination, multi-JOIN with conditional SQL.
 * SQL is kept directly in the service — no DAL, no hydrator, no mapper.
 *
 * Response shape: { machines: [...], events: [...] }
 * Events are post-processed to enforce ICT working-hour time stamps.
 */

import { db } from '../../shared/db/index.js';

/**
 * Fetch the calendar data: machine resources + production plan day events.
 *
 * @param {{
 *   factory_id?: string,
 *   start_date: string,
 *   end_date: string,
 *   is_unassigned?: string
 * }} query
 * @returns {Promise<{ machines: object[], events: object[] }>}
 */
async function getCalendar({ factory_id, start_date, end_date, is_unassigned }) {
  const unassignedMode = is_unassigned === "true";

  // 1. Fetch Machines/Resources
  let machines = [];
  if (unassignedMode) {
    machines = [{ id: "unassigned", title: "CHƯA GÁN MÁY" }];
  } else {
    let machineQuery =
      "SELECT id, COALESCE(code, name) as title, color FROM machines WHERE deleted_at IS NULL";
    const machineParams = [];
    if (factory_id && factory_id !== "all") {
      machineQuery += " AND factory_id = $1";
      machineParams.push(factory_id);
    }
    machineQuery += " ORDER BY sort_order ASC, COALESCE(code, name) ASC";
    const machinesRes = await db.query(machineQuery, machineParams);
    machines = machinesRes.rows;
  }

  // 2. Fetch Schedule Events (Daily segments from production_plan_days)
  let scheduleQuery = `
            SELECT
                ppd.id,
                pp.id as production_plan_id,
                ${unassignedMode ? "'unassigned'" : 'pp.machine_id'} as "resourceId",
                COALESCE(o.name, p.name, 'L-' || pp.id) as title,
                o.name as order_code,
                p.name as product_name,
                o.po_customer,
                op.name as operation_name,
                ppd.working_date as start,
                ppd.working_date as end,
                (ppd.planned_work_quantity / 8.0) as planned_work_quantity,
                ppd.is_overtime as is_overtime,
                pp.status as color_status,
                pp.stopped_at as stopped_at,
                pp.status as status
            FROM production_plan_days ppd
            JOIN production_plans pp ON ppd.production_plan_id = pp.id
            ${unassignedMode ? "LEFT JOIN machines m ON pp.machine_id = m.id" : "JOIN machines m ON pp.machine_id = m.id"}
            LEFT JOIN orders o ON pp.order_id = o.id
            LEFT JOIN products p ON pp.product_id = p.id
            LEFT JOIN product_group_operations pgo ON pp.product_group_operation_id = pgo.id
            LEFT JOIN operations op ON pgo.operation_id = op.id
            WHERE ppd.deleted_at IS NULL
              AND pp.deleted_at IS NULL
              AND ppd.working_date <= $2
              AND ppd.working_date >= $1
        `;
  const scheduleParams = [start_date, end_date];

  if (unassignedMode) {
    scheduleQuery += " AND pp.machine_id IS NULL";
  }

  if (factory_id && factory_id !== "all") {
    scheduleQuery += " AND (m.factory_id = $3 OR (m.factory_id IS NULL AND pp.factory_id = $3))";
    scheduleParams.push(factory_id);
  }

  const eventsRes = await db.query(scheduleQuery, scheduleParams);

  const events = eventsRes.rows.map((ev) => {
    // Since we configured PG to return ISO-like strings,
    // we split on 'T' or space to get the date part
    const datePart = String(ev.start).split(/[ T]/)[0];

    return {
      ...ev,
      start: `${datePart}T07:00:00+07:00`,
      end: `${datePart}T16:30:00+07:00`,
      allDay: false, // Changed to false to allow potential overlapping segments on the same day
      backgroundColor: ev.color_status === "DONE" ? "#10b981" : "#3b82f6", // More modern colors
    };
  });

  return { machines, events };
}

export const machineScheduleService = {
  getCalendar,
};
