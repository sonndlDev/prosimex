import pool from "../config/db.js";

export async function generateDailyTickets(targetDate) {
  const client = await pool.connect();
  try {
    console.log(`[AutoTicket] Starting auto-generation for date: ${targetDate}`);

    // 1. Query tất cả plan days cho ngày target
    const plansResult = await client.query(
      `SELECT
          pp.id                               AS plan_id,
          pp.order_id,
          pp.product_id,
          pp.product_group_operation_id,
          pp.machine_id                       AS machine_id,
          op.name                             AS operation_name,
          ppd.planned_work_quantity,
          pp.dinh_muc
       FROM production_plan_days ppd
       JOIN production_plans pp
         ON pp.id = ppd.production_plan_id
        AND pp.deleted_at IS NULL
        AND (pp.status IS NULL OR pp.status != 'DONE')
        AND (
          pp.status IS NULL 
          OR pp.status != 'STOPPED' 
          OR (pp.stopped_at IS NOT NULL AND DATE(pp.stopped_at AT TIME ZONE 'Asia/Ho_Chi_Minh') >= $1)
        )
       LEFT JOIN product_group_operations pgo
         ON pp.product_group_operation_id = pgo.id
       LEFT JOIN operations op
         ON pgo.operation_id = op.id
       WHERE DATE(ppd.working_date AT TIME ZONE 'Asia/Ho_Chi_Minh') = $1
         AND ppd.deleted_at IS NULL
         AND pp.machine_id IS NOT NULL
         AND pp.machine_id > 0`,
      [targetDate]
    );

    if (plansResult.rowCount === 0) {
      console.log(`[AutoTicket] No plans with explicit machine assignment found for ${targetDate}.`);
      return { created: 0, skipped: 0, ticketIds: [] };
    }

    console.log(`[AutoTicket] Found ${plansResult.rowCount} plan items to potentially process.`);

    // 2. Tìm machine_id đã có ticket trong ngày này → skip
    const existingResult = await client.query(
      `SELECT machine_id
       FROM daily_production_tickets
       WHERE ticket_date = $1
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

    // 3. Group các plan theo machine_id — bỏ qua máy đã có ticket
    //    Cùng máy, khác công đoạn/đơn hàng → vẫn chung 1 phiếu (nhiều items)
    const machineGroups = {}; // { machine_id: [planRow, ...] }
    for (const row of plansResult.rows) {
      const machineId = parseInt(row.machine_id);
      if (!machineId || isNaN(machineId)) continue;
      if (existingMachineIds.has(machineId)) continue;
      if (!machineGroups[machineId]) machineGroups[machineId] = [];
      machineGroups[machineId].push(row);
    }

    // DEBUG LOG — xóa sau khi xác nhận đúng
    console.log(`[AutoTicket] machineGroups keys:`, Object.keys(machineGroups));
    console.log(`[AutoTicket] Total groups:`, Object.keys(machineGroups).length);
    for (const [mid, plans] of Object.entries(machineGroups)) {
      console.log(
        `  machine_id=${mid} → ${plans.length} plan(s):`,
        plans.map((p) => `[order=${p.order_id} op=${p.operation_name}]`)
      );
    }

    const machineIds = Object.keys(machineGroups);
    if (machineIds.length === 0) {
      console.log(`[AutoTicket] All machines already have tickets for ${targetDate}. Nothing new to create.`);
      return { created: 0, skipped: existingMachineIds.size, ticketIds: [] };
    }

    // 4. Tạo 1 ticket per machine group
    await client.query("BEGIN");
    const createdTicketIds = [];

    for (const machineId of machineIds) {
      const plans = machineGroups[machineId];

      // 4a. Insert ticket header — 1 máy = 1 ticket duy nhất
      const ticketInsert = await client.query(
        `INSERT INTO daily_production_tickets
            (ticket_date, status, machine_id, is_auto_generated, created_by)
         VALUES ($1, 'DRAFT', $2, TRUE, NULL)
         RETURNING id`,
        [targetDate, machineId]
      );
      const ticketId = ticketInsert.rows[0].id;
      console.log(
        `[AutoTicket] Created ticket #${ticketId} for machine_id=${machineId} with ${plans.length} item(s).`
      );

      // 4b. Bulk-insert ticket items — mỗi plan/công đoạn là 1 item trong cùng phiếu
      if (plans.length > 0) {
        const itemValues = plans
          .map(
            (_, i) =>
              `($1, $${i * 6 + 2}, $${i * 6 + 3}, $${i * 6 + 4}, $${i * 6 + 5}, $${i * 6 + 6}, $${i * 6 + 7})`
          )
          .join(", ");
        const itemParams = [
          ticketId,
          ...plans.flatMap((p) => [
            p.order_id || null,
            p.product_id || null,
            p.product_group_operation_id || null,
            p.operation_name || null,
            Math.round((parseFloat(p.planned_work_quantity) / 8) * (parseFloat(p.dinh_muc) || 0)),
            p.plan_id || null,
          ]),
        ];
        await client.query(
          `INSERT INTO daily_production_ticket_items
              (ticket_id, order_id, product_id, product_group_operation_id, operation_name, planned_quantity, production_plan_id)
           VALUES ${itemValues}`,
          itemParams
        );
        console.log(
          `[AutoTicket] Inserted ${plans.length} item(s) into ticket #${ticketId}:`,
          plans.map((p) => `[order=${p.order_id} op=${p.operation_name} qty=${Math.round((parseFloat(p.planned_work_quantity) / 8) * (parseFloat(p.dinh_muc) || 0))}]`)
        );
      }

      createdTicketIds.push(ticketId);
    }

    // 5. Audit log
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