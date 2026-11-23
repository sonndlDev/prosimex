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

const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

function getVietnamDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: VN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: parseInt(map.hour, 10),
  };
}

/**
 * Đọc cấu hình lịch tạo phiếu từ bảng auto_ticket_schedule_rules (chỉ quy tắc chưa xóa).
 * - offRunDates:  các ngày KHÔNG chạy job.
 * - extraTargets: { 'ngày chạy': ['ngày target thêm', ...] }
 */
/** Liệt kê các ngày YYYY-MM-DD từ start đến end (bao gồm hai đầu). end null = chỉ start. */
export function expandDateRange(start, end) {
  const endDate = end || start;
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${endDate}T00:00:00Z`);
  const dates = [];
  for (let ms = startMs; ms <= endMs; ms += 86400000) {
    dates.push(new Date(ms).toISOString().slice(0, 10));
  }
  return dates;
}

export async function loadAutoTicketConfig(db = pool) {
  const { rows } = await db.query(
    `SELECT rule_type,
            to_char(run_date, 'YYYY-MM-DD')                AS run_date,
            to_char(run_date_end, 'YYYY-MM-DD')            AS run_date_end,
            to_char(target_date, 'YYYY-MM-DD')             AS target_date,
            to_char(target_date_end, 'YYYY-MM-DD')         AS target_date_end,
            to_char(skip_run_date, 'YYYY-MM-DD')           AS skip_run_date,
            to_char(skip_run_date_end, 'YYYY-MM-DD')       AS skip_run_date_end
       FROM auto_ticket_schedule_rules
      WHERE deleted_at IS NULL
        AND status = 'ACTIVE'`
  );
  const config = { offRunDates: [], extraTargets: {} };
  for (const r of rows) {
    const runDays = expandDateRange(r.run_date, r.run_date_end);
    if (r.rule_type === "OFF_RUN") {
      config.offRunDates.push(...runDays);
    } else if (r.rule_type === "EXTRA_TARGET") {
      const targetDays = expandDateRange(r.target_date, r.target_date_end);
      for (const runDay of runDays) {
        (config.extraTargets[runDay] ||= []).push(...targetDays);
      }
      // Ngày không chạy job khai báo ngay trong quy tắc này
      if (r.skip_run_date) {
        config.offRunDates.push(...expandDateRange(r.skip_run_date, r.skip_run_date_end));
      }
    }
  }
  return config;
}

/**
 * Xác định các ngày cần tạo lịch tại thời điểm `now` (múi giờ Asia/Ho_Chi_Minh).
 * Quy tắc mặc định:
 * - Chủ nhật: không tạo.
 * - Thứ 7 buổi chiều (>= 12h): tạo cho Chủ nhật và Thứ 2.
 * - Các ngày khác: tạo cho ngày mai.
 * Sau đó áp dụng config: thêm extraTargets của hôm nay, hoặc trả về [] nếu hôm nay nằm trong offRunDates.
 */
export function getAutoTicketTargetDates(now = new Date(), config = null) {
  const { year, month, day, hour } = getVietnamDateParts(now);
  const baseMs = Date.UTC(year, month - 1, day);
  const dayOfWeek = new Date(baseMs).getUTCDay(); // 0 = CN, 6 = T7
  const addDays = (n) => new Date(baseMs + n * 86400000).toISOString().slice(0, 10);
  const today = addDays(0);

  if (config?.offRunDates?.includes(today)) return [];

  let targets = [];
  if (dayOfWeek === 0) targets = [];
  else if (dayOfWeek === 6 && hour >= 12) targets = [addDays(1), addDays(2)];
  else targets = [addDays(1)];

  const extra = config?.extraTargets?.[today] || [];
  return [...new Set([...targets, ...extra])].sort();
}

/**
 * Cập nhật job_status của các quy tắc ACTIVE có run_date = runDate.
 * Chỉ chuyển khi trạng thái hiện tại khớp fromStatus.
 */
const COVERS_DAY_SQL = `
        AND status = 'ACTIVE'
        AND deleted_at IS NULL
        AND run_date <= $1
        AND COALESCE(run_date_end, run_date) >= $1`;

/** Job bắt đầu chạy trong ngày: các quy tắc phủ ngày này chuyển PENDING -> RUNNING. */
async function markRulesRunning(day) {
  await pool.query(
    `UPDATE auto_ticket_schedule_rules
        SET job_status = 'RUNNING'
      WHERE job_status = 'PENDING' ${COVERS_DAY_SQL}`,
    [day]
  );
}

/**
 * Job của ngày xong: RUNNING -> DONE nếu đây là ngày cuối của khoảng,
 * ngược lại quay về PENDING (còn các ngày sau trong khoảng).
 */
async function markRulesFinished(day) {
  await pool.query(
    `UPDATE auto_ticket_schedule_rules
        SET job_status = CASE WHEN COALESCE(run_date_end, run_date) = $1 THEN 'DONE' ELSE 'PENDING' END,
            last_run_at = CURRENT_TIMESTAMP
      WHERE job_status = 'RUNNING' ${COVERS_DAY_SQL}`,
    [day]
  );
}

/** Job lỗi: RUNNING -> PENDING để lần sau chạy lại. */
async function markRulesFailed(day) {
  await pool.query(
    `UPDATE auto_ticket_schedule_rules
        SET job_status = 'PENDING'
      WHERE job_status = 'RUNNING' ${COVERS_DAY_SQL}`,
    [day]
  );
}

/**
 * Entry point cho scheduler: chạy generateDailyTickets cho các ngày mục tiêu.
 * Khi không truyền config (chạy theo lịch), đọc cấu hình từ DB và cập nhật job_status
 * của các quy tắc có run_date = hôm nay: PENDING -> RUNNING -> DONE (lỗi thì trả về PENDING).
 */
export async function runAutoTicketGeneration(now = new Date(), config = null) {
  const fromDb = !config;
  const { year, month, day } = getVietnamDateParts(now);
  const todayVn = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  if (fromDb) await markRulesRunning(todayVn);

  try {
    const effectiveConfig = config || (await loadAutoTicketConfig());
    const targetDates = getAutoTicketTargetDates(now, effectiveConfig);

    const results = [];
    if (targetDates.length === 0) {
      console.log(`[AutoTicket] Không có ngày target nào cần tạo phiếu (chủ nhật hoặc ngày off).`);
    }
    for (const targetDate of targetDates) {
      const summary = await generateDailyTickets(targetDate);
      results.push({ targetDate, ...summary });
    }

    if (fromDb) await markRulesFinished(todayVn);
    return results;
  } catch (error) {
    if (fromDb) await markRulesFailed(todayVn);
    throw error;
  }
}