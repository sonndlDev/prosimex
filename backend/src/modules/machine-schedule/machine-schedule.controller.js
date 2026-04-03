import pool from "../../config/db.js";

export const getMachineScheduleCalendar = async (req, res) => {
  try {
    const { factory_id, start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res
        .status(400)
        .json({ message: "Missing parameters: start_date, end_date required" });
    }

    // 1. Fetch Machines for the Resource Axis
    let machineQuery =
      "SELECT id, name as title FROM machines WHERE deleted_at IS NULL";
    const machineParams = [];
    if (factory_id && factory_id !== "all") {
      machineQuery += " AND factory_id = $1";
      machineParams.push(factory_id);
    }
    const machinesRes = await pool.query(machineQuery, machineParams);

    // 2. Fetch Schedule Events (Daily segments from production_plan_days)
    let scheduleQuery = `
            SELECT 
                ppd.id,
                pp.machine_id as "resourceId",
                COALESCE(o.order_code, p.name, 'L-' || pp.id) as title,
                o.order_code,
                p.name as product_name,
                o.po_customer,
                op.name as operation_name,
                ppd.working_date as start,
                ppd.working_date as end,
                (ppd.planned_work_quantity / 8.0) as planned_work_quantity,
                pp.status as color_status
            FROM production_plan_days ppd
            JOIN production_plans pp ON ppd.production_plan_id = pp.id
            JOIN machines m ON pp.machine_id = m.id
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
    if (factory_id && factory_id !== "all") {
      scheduleQuery += " AND m.factory_id = $3";
      scheduleParams.push(factory_id);
    }

    const eventsRes = await pool.query(scheduleQuery, scheduleParams);

    res.json({
      machines: machinesRes.rows,
      events: eventsRes.rows.map((ev) => {
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
      }),
    });
  } catch (error) {
    console.error("Schedule Error:", error);
    res
      .status(500)
      .json({ message: "Error retrieving timeline schedule", error });
  }
};
