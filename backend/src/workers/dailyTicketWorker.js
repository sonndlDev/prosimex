import pool from "../config/db.js";

/**
 * Auto-generates daily production tickets for a given date.
 *
 * Rules:
 * - Only plans WITH a machine_id assigned are processed.
 * - Plans sharing the same machine → 1 shared ticket (chung phiếu).
 * - Plans on different machines → 1 ticket per machine (phiếu riêng).
 * - Idempotent (soft): Only creates tickets for machines that don't already
 *   have an auto-generated ticket for that date. Machines already covered
 *   are skipped; machines not yet covered are created.
 *
 * @param {string} targetDate - Date string 'YYYY-MM-DD' (Asia/Ho_Chi_Minh timezone)
 * @returns {{ created: number, skipped: number, ticketIds: number[] }}
 */
export async function generateDailyTickets(targetDate) {
  const client = await pool.connect();
  try {
    console.log(`[AutoTicket] Starting auto-generation for date: ${targetDate}`);

    // 1. Query all production plan days for the target date
    //    - Only plans WITH machine_id (pp.machine_id OR pgo.machine_id)
    //    - Exclude STOPPED plans
    const plansResult = await client.query(
      `SELECT
          pp.id                               AS plan_id,
          pp.order_id,
          pp.product_id,
          pp.product_group_operation_id,
          COALESCE(pp.machine_id, pgo.machine_id)  AS machine_id,
          op.name                             AS operation_name,
          ppd.planned_work_quantity,
          ppd.working_date
       FROM production_plan_days ppd
       JOIN production_plans pp
         ON pp.id = ppd.production_plan_id
        AND pp.deleted_at IS NULL
        AND (pp.status IS NULL OR pp.status != 'DONE')
        AND (pp.status IS NULL OR pp.status != 'STOPPED' OR DATE(pp.stopped_at AT TIME ZONE 'Asia/Ho_Chi_Minh') >= $1)
       LEFT JOIN product_group_operations pgo
         ON pp.product_group_operation_id = pgo.id
       LEFT JOIN operations op
         ON pgo.operation_id = op.id
       WHERE DATE(ppd.working_date AT TIME ZONE 'Asia/Ho_Chi_Minh') = $1
         AND ppd.deleted_at IS NULL
         AND COALESCE(pp.machine_id, pgo.machine_id) IS NOT NULL`,
      [targetDate]
    );

    if (plansResult.rowCount === 0) {
      console.log(
        `[AutoTicket] No plans with machine assignment found for ${targetDate}. Nothing to generate.`
      );
      return { created: 0, skipped: 0, ticketIds: [] };
    }

    // 2. Find which machine_ids already have an auto-generated ticket for this date
    const existingResult = await client.query(
      `SELECT machine_id
       FROM daily_production_tickets
       WHERE ticket_date = $1
         AND is_auto_generated = TRUE
         AND deleted_at IS NULL`,
      [targetDate]
    );
    const existingMachineIds = new Set(
      existingResult.rows.map((r) => parseInt(r.machine_id))
    );

    if (existingMachineIds.size > 0) {
      console.log(
        `[AutoTicket] Machines already covered for ${targetDate}: [${[...existingMachineIds].join(", ")}]`
      );
    }

    // 3. Group remaining plans by machine_id — skip machines already covered
    const machineGroups = {}; // { machine_id: [planRow, ...] }
    for (const row of plansResult.rows) {
      const machineId = parseInt(row.machine_id);
      if (existingMachineIds.has(machineId)) continue;
      if (!machineGroups[machineId]) machineGroups[machineId] = [];
      machineGroups[machineId].push(row);
    }

    const machineIds = Object.keys(machineGroups);
    if (machineIds.length === 0) {
      console.log(
        `[AutoTicket] All machines already have tickets for ${targetDate}. Nothing new to create.`
      );
      return { created: 0, skipped: existingMachineIds.size, ticketIds: [] };
    }

    // 4. Create one ticket per machine group
    await client.query("BEGIN");
    const createdTicketIds = [];

    for (const machineId of machineIds) {
      const plans = machineGroups[machineId];

      // 4a. Insert ticket header
      const ticketInsert = await client.query(
        `INSERT INTO daily_production_tickets
            (ticket_date, status, machine_id, is_auto_generated, created_by)
         VALUES ($1, 'DRAFT', $2, TRUE, NULL)
         RETURNING id`,
        [targetDate, machineId]
      );
      const ticketId = ticketInsert.rows[0].id;

      // 4b. Bulk-insert ticket items (one row per plan)
      if (plans.length > 0) {
        const itemValues = plans
          .map(
            (_, i) =>
              `($1, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5}, $${i * 5 + 6})`
          )
          .join(", ");
        const itemParams = [
          ticketId,
          ...plans.flatMap((p) => [
            p.order_id || null,
            p.product_id || null,
            p.product_group_operation_id || null,
            p.operation_name || null,
            parseFloat(p.planned_work_quantity) || 0,
          ]),
        ];
        await client.query(
          `INSERT INTO daily_production_ticket_items
              (ticket_id, order_id, product_id, product_group_operation_id, operation_name, planned_quantity)
           VALUES ${itemValues}`,
          itemParams
        );
      }

      createdTicketIds.push(ticketId);
      console.log(
        `[AutoTicket] Created ticket #${ticketId} for machine_id=${machineId} with ${plans.length} item(s).`
      );
    }

    // 5. Audit log — user_id = NULL indicates system-generated
    for (const ticketId of createdTicketIds) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
         VALUES (NULL, 'AUTO_CREATE', 'DailyProductionTicket', $1, $2)`,
        [ticketId, JSON.stringify({ ticket_date: targetDate, source: "scheduler" })]
      );
    }

    await client.query("COMMIT");

    const summary = {
      created: createdTicketIds.length,
      skipped: existingMachineIds.size,
      ticketIds: createdTicketIds,
    };
    console.log(`[AutoTicket] Done for ${targetDate}: ${JSON.stringify(summary)}`);
    return summary;
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[AutoTicket] Error during auto-generation:", error);
    throw error;
  } finally {
    client.release();
  }
}
