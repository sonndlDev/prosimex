// TEMPORARY: Functions not yet refactored — remove after full extraction to service/repository
import pool from '../../config/db.js';
import { generateDailyTickets } from '../../workers/dailyTicketWorker.js';
import { getIo } from '../../sockets/index.js';
import { calculateValidWorkMinutes, calculateActualLabor } from '../../utils/labor-calculation.util.js';

const toIntOrNull = (v) => (v === null || v === undefined || v === "null" || v === "") ? null : parseInt(v);

// Parse thời gian từ file Excel import.
// Chấp nhận: "dd/MM/yyyy HH:mm", "yyyy-MM-dd HH:mm" (hoặc có 'T'), "HH:mm" (lấy ngày từ fallbackDate yyyy-MM-dd).
// Trả về: chuỗi "yyyy-MM-dd HH:mm:00" | null (ô trống) | undefined (không hợp lệ)
const parseImportDateTime = (value, fallbackDate) => {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const str = String(value).trim();
  const pad = (n) => String(n).padStart(2, "0");

  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (m) {
    const [, d, mo, y, h, mi] = m;
    return `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${mi}:00`;
  }

  m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})[T\s](\d{1,2}):(\d{2})/);
  if (m) {
    const [, y, mo, d, h, mi] = m;
    return `${y}-${pad(mo)}-${pad(d)} ${pad(h)}:${mi}:00`;
  }

  m = str.match(/^(\d{1,2}):(\d{2})$/);
  if (m && fallbackDate) {
    const [, h, mi] = m;
    return `${fallbackDate} ${pad(h)}:${mi}:00`;
  }

  return undefined;
};

// POST /api/daily-tickets
export const createTicket = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { ticket_date, items, is_manual } = req.body;
    const created_by = req.user.id;

    const hasAutoApprove = req.user.role_name === 'ADMIN' ||
      (req.user.permissions || []).includes('daily_tickets:auto_approve');
    const ticketStatus = hasAutoApprove ? 'APPROVED' : 'PENDING_APPROVAL';

    const ticketInsert = await client.query(
      `INSERT INTO daily_production_tickets (ticket_date, is_manual, created_by, modified_by, status)
      VALUES ($1, $2, $3, $3, $4) RETURNING *`,
      [ticket_date, is_manual || false, created_by, ticketStatus]
    );
    const newTicket = ticketInsert.rows[0];

    if (items && items.length > 0) {
      const itemValues = items
        .map((_, i) => `($1, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8}, $${i * 8 + 9})`)
        .join(", ");
      const itemParams = [
        newTicket.id,
        ...items.flatMap(item => [
          item.order_id || null,
          item.product_id || null,
          item.product_group_operation_id || null,
          toIntOrNull(item.product_group_operation_id) ? null : (item.operation_name || null),
          item.planned_quantity || 0,
          item.actual_quantity || 0,
          item.notes ? String(item.notes) : null,
          item.production_plan_id || null
        ]),
      ];
      await client.query(
        `INSERT INTO daily_production_ticket_items
           (ticket_id, order_id, product_id, product_group_operation_id, operation_name, planned_quantity, actual_quantity, notes, production_plan_id)
           VALUES ${itemValues}`,
        itemParams,
      );
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id)
       VALUES ($1, 'CREATE', 'DailyProductionTicket', $2)`,
      [created_by, newTicket.id]
    );

    await client.query("COMMIT");
    res.status(201).json({ message: "Daily ticket created successfully", ticket: newTicket });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create Daily Ticket Error:", error);
    res.status(500).json({ message: "Error creating daily ticket", error });
  } finally {
    client.release();
  }
};

// PUT /api/daily-tickets/:id
export const updateTicket = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const { ticket_date, items, is_manual } = req.body;
    const user_id = req.user.id;

    const ticketRes = await client.query(
      "SELECT * FROM daily_production_tickets WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );
    if (ticketRes.rowCount === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticketRes.rows[0].status === "COMPLETED") {
      return res.status(400).json({ message: "Cannot edit a completed ticket!" });
    }

    // Update ticket header
    await client.query(
      "UPDATE daily_production_tickets SET ticket_date = $1, is_manual = $4, updated_at = CURRENT_TIMESTAMP, modified_by = $3, modified_time = CURRENT_TIMESTAMP WHERE id = $2",
      [ticket_date, id, user_id, is_manual || false]
    );

    // Re-create items (since logic is to only edit un-completed tickets)
    await client.query("DELETE FROM daily_production_ticket_items WHERE ticket_id = $1", [id]);

    if (items && items.length > 0) {
      const itemValues = items
        .map((_, i) => `($1, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8}, $${i * 8 + 9})`)
        .join(", ");
      const itemParams = [
        id,
        ...items.flatMap(item => [
          toIntOrNull(item.order_id),
          toIntOrNull(item.product_id),
          toIntOrNull(item.product_group_operation_id),  // ← không còn bị "null" string
           toIntOrNull(item.product_group_operation_id) ? null : (item.operation_name || null),
          parseFloat(item.planned_quantity) || 0,
          parseFloat(item.actual_quantity) || 0,
          item.notes ? String(item.notes) : null,
          null
        ]),
      ];
      await client.query(
        `INSERT INTO daily_production_ticket_items
           (ticket_id, order_id, product_id, product_group_operation_id, operation_name, planned_quantity, actual_quantity, notes, production_plan_id)
           VALUES ${itemValues}`,
        itemParams,
      );
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id)
       VALUES ($1, 'UPDATE', 'DailyProductionTicket', $2)`,
      [user_id, id]
    );

    await client.query("COMMIT");
    res.json({ message: "Ticket updated successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update Ticket Error:", error);
    res.status(500).json({ message: "Error updating ticket", error });
  } finally {
    client.release();
  }
};

// PUT /api/daily-tickets/:id/results
export const updateTicketResults = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const { items } = req.body; // Array of { id: item_id, actual_quantity: value }
    const user_id = req.user.id;

    const ticketRes = await client.query(
      "SELECT * FROM daily_production_tickets WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );
    if (ticketRes.rowCount === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Bulk UPDATE actual_quantity dùng unnest — 1 query thay vì N queries
    if (items && items.length > 0) {
      const itemIds          = items.map(i => parseInt(i.id));
      const actualQtys       = items.map(i => parseFloat(i.actual_quantity) || 0);
      const actualNotesArr   = items.map(i => i.actual_notes ? String(i.actual_notes) : null);

      // Tinh labor cho tung item
      const laborData        = items.map(i => buildLaborFields(i));
      const startTimes       = laborData.map(l => l.startTime);
      const endTimes         = laborData.map(l => l.endTime);
      const workerCounts     = laborData.map(l => l.workerCount);
      const validWorkMins    = laborData.map(l => l.validWorkMinutes);
      const actualLabors     = laborData.map(l => l.actualLabor);

      await client.query(
        `UPDATE daily_production_ticket_items AS dti
         SET
           actual_quantity    = v.qty,
           actual_notes       = v.actual_note,
           start_time         = v.start_time,
           end_time           = v.end_time,
           worker_count       = v.worker_count,
           valid_work_minutes = v.valid_work_minutes,
           actual_labor       = v.actual_labor,
           updated_at         = CURRENT_TIMESTAMP
         FROM (
           SELECT
             unnest($1::int[])       AS id,
             unnest($2::numeric[])   AS qty,
             unnest($4::text[])      AS actual_note,
             unnest($5::timestamp[]) AS start_time,
             unnest($6::timestamp[]) AS end_time,
             unnest($7::int[])       AS worker_count,
             unnest($8::numeric[])   AS valid_work_minutes,
             unnest($9::numeric[])   AS actual_labor
         ) AS v
         WHERE dti.id = v.id AND dti.ticket_id = $3`,
        [itemIds, actualQtys, id, actualNotesArr, startTimes, endTimes, workerCounts, validWorkMins, actualLabors],
      );
    }

    // Mark as completed if some condition met? For now, let's just mark it COMPLETED if actual quantities are submitted.
    await client.query(
      "UPDATE daily_production_tickets SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1",
      [id, user_id]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id)
       VALUES ($1, 'UPDATE_RESULTS', 'DailyProductionTicket', $2)`,
      [user_id, id]
    );

    await client.query("COMMIT");
    res.json({ message: "Ticket results updated successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update Ticket Results Error:", error);
    res.status(500).json({ message: "Error updating ticket results", error });
  } finally {
    client.release();
  }
};

// DELETE /api/daily-tickets/:id
export const deleteTicket = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const user_id = req.user.id;

    const ticketRes = await client.query(
      "SELECT * FROM daily_production_tickets WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );
    if (ticketRes.rowCount === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    await client.query(
      "UPDATE daily_production_tickets SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1",
      [id, user_id]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id)
       VALUES ($1, 'DELETE', 'DailyProductionTicket', $2)`,
      [user_id, id]
    );

    await client.query("COMMIT");
    res.json({ message: "Ticket deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete Ticket Error:", error);
    res.status(500).json({ message: "Error deleting ticket", error });
  } finally {
    client.release();
  }
};

// POST /api/daily-tickets/import-results
// Body: { rows: [{ ma_phieu, ma_sp, cong_doan, sl_thuc_te, ghi_chu_tt }] }
export const importResults = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = req.body;
    const user_id = req.user.id;

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: "Không có dữ liệu để import" });
    }

    const results = [];
    const updatedTicketIds = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;
      const { ma_phieu, ma_sp, cong_doan, sl_thuc_te, ghi_chu_tt, tg_bat_dau, tg_ket_thuc } = row;

      if (!ma_phieu || String(ma_phieu).trim().length <= 8) {
        results.push({ row: rowNum, ma_phieu, ma_sp, cong_doan, sl_thuc_te, success: false, error: "Mã Phiếu không hợp lệ" });
        continue;
      }

      const ticketId = parseInt(String(ma_phieu).trim().slice(8), 10);
      if (isNaN(ticketId)) {
        results.push({ row: rowNum, ma_phieu, ma_sp, cong_doan, sl_thuc_te, success: false, error: "Không thể đọc ID phiếu từ Mã Phiếu" });
        continue;
      }

      const actualQty = parseFloat(String(sl_thuc_te ?? "").replace(",", "."));
      if (isNaN(actualQty) || actualQty < 0) {
        results.push({ row: rowNum, ma_phieu, ma_sp, cong_doan, sl_thuc_te, success: false, error: "SL Thực tế không hợp lệ" });
        continue;
      }

      // Ngày phiếu lấy từ 8 chữ số đầu của Mã Phiếu (yyyyMMdd)
      const ticketDateStr = String(ma_phieu).trim().slice(0, 8);
      const ticketDateIso = `${ticketDateStr.slice(0, 4)}-${ticketDateStr.slice(4, 6)}-${ticketDateStr.slice(6, 8)}`;
      const startTimeInput = parseImportDateTime(tg_bat_dau, ticketDateIso);
      const endTimeInput = parseImportDateTime(tg_ket_thuc, ticketDateIso);
      if (startTimeInput === undefined || endTimeInput === undefined) {
        results.push({ row: rowNum, ma_phieu, ma_sp, cong_doan, sl_thuc_te, success: false, error: "Thời gian bắt đầu/kết thúc không hợp lệ (dùng dd/MM/yyyy HH:mm)" });
        continue;
      }
      if (startTimeInput && endTimeInput && endTimeInput <= startTimeInput) {
        results.push({ row: rowNum, ma_phieu, ma_sp, cong_doan, sl_thuc_te, success: false, error: "Thời gian kết thúc phải sau thời gian bắt đầu" });
        continue;
      }

      const ticketRes = await client.query(
        "SELECT id, status FROM daily_production_tickets WHERE id = $1 AND deleted_at IS NULL",
        [ticketId]
      );
      if (ticketRes.rowCount === 0) {
        results.push({ row: rowNum, ma_phieu, ma_sp, cong_doan, sl_thuc_te, success: false, error: `Không tìm thấy phiếu #${ticketId}` });
        continue;
      }
      if (ticketRes.rows[0].status === "COMPLETED") {
        results.push({ row: rowNum, ma_phieu, ma_sp, cong_doan, sl_thuc_te, success: false, error: "Phiếu đã chốt (COMPLETED), không thể cập nhật" });
        continue;
      }

      // Tìm item theo tên mã hàng + tên công đoạn
      const itemRes = await client.query(
        `SELECT dti.id, dti.start_time, dti.end_time, dti.worker_count
         FROM daily_production_ticket_items dti
         LEFT JOIN products p ON dti.product_id = p.id
         LEFT JOIN product_group_operations pgo ON dti.product_group_operation_id = pgo.id
         LEFT JOIN operations op ON pgo.operation_id = op.id
         WHERE dti.ticket_id = $1
           AND LOWER(TRIM(COALESCE(p.name, ''))) = LOWER(TRIM($2))
           AND LOWER(TRIM(COALESCE(op.name, dti.operation_name, ''))) = LOWER(TRIM($3))
         LIMIT 1`,
        [ticketId, String(ma_sp || "").trim(), String(cong_doan || "").trim()]
      );

      if (itemRes.rowCount === 0) {
        results.push({ row: rowNum, ma_phieu, ma_sp, cong_doan, sl_thuc_te, success: false, error: `Không tìm thấy dòng "${ma_sp} / ${cong_doan}" trong phiếu #${ticketId}` });
        continue;
      }

      const existingItem = itemRes.rows[0];
      // Ô thời gian trống -> giữ nguyên giá trị hiện có
      const startTime = startTimeInput ?? existingItem.start_time;
      const endTime = endTimeInput ?? existingItem.end_time;
      // Tính lại công thực tế theo giờ mới (buildLaborFields chỉ trả về số công khi đủ dữ liệu)
      const labor = buildLaborFields({ start_time: startTime, end_time: endTime, worker_count: existingItem.worker_count });

      await client.query(
        `UPDATE daily_production_ticket_items
         SET actual_quantity = $1, actual_notes = $2,
             start_time = $4, end_time = $5,
             valid_work_minutes = $6, actual_labor = $7,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [
          actualQty,
          ghi_chu_tt ? String(ghi_chu_tt) : null,
          existingItem.id,
          startTime || null,
          endTime || null,
          labor.validWorkMinutes,
          labor.actualLabor,
        ]
      );

      updatedTicketIds.add(ticketId);
      results.push({ row: rowNum, ma_phieu, ma_sp, cong_doan, sl_thuc_te, success: true, message: "Cập nhật thành công" });
    }

    // Nếu tất cả items của phiếu đã có actual_quantity → mark COMPLETED
    for (const ticketId of updatedTicketIds) {
      const checkRes = await client.query(
        `SELECT COUNT(*) AS total,
                COUNT(*) FILTER (WHERE actual_quantity IS NOT NULL AND actual_quantity > 0) AS filled
         FROM daily_production_ticket_items WHERE ticket_id = $1`,
        [ticketId]
      );
      const { total, filled } = checkRes.rows[0];
      if (parseInt(total) > 0 && parseInt(total) === parseInt(filled)) {
        await client.query(
          "UPDATE daily_production_tickets SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1",
          [ticketId, user_id]
        );
      }
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
       VALUES ($1, 'IMPORT_RESULTS', 'DailyProductionTicket', 0, $2)`,
      [user_id, JSON.stringify({ total: rows.length, success: results.filter(r => r.success).length })]
    );

    await client.query("COMMIT");

    const successCount = results.filter(r => r.success).length;
    res.json({
      results,
      summary: { total: rows.length, success: successCount, failed: rows.length - successCount },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Import Results Error:", error);
    res.status(500).json({ message: "Lỗi import: " + error.message });
  } finally {
    client.release();
  }
};

// GET /api/v1/daily-tickets/report/plan-vs-actual
export const getPlanVsActualReport = async (req, res) => {
  try {
    const {
      order_id,
      product_id,
      operation_id,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
      sortBy = "order_code",
      sortDirection = "DESC",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const ppMatchSql = `
      pp_m.order_id = base.order_id
      AND pp_m.product_id IS NOT DISTINCT FROM base.product_id
      AND pp_m.product_group_operation_id IS NOT DISTINCT FROM base.product_group_operation_id
      AND pp_m.deleted_at IS NULL
    `;

    const sortMap = {
      order_code: "o.order_code",
      product_name: "p.name",
      operation_name: "op.name",
      sequence_order: "pgo.sequence_order",
      plan_quantity: "plan_quantity",
      planned_start_date: `(SELECT MIN(pp_s.planned_start_date) FROM production_plans pp_s WHERE pp_s.deleted_at IS NULL AND pp_s.order_id = base.order_id AND pp_s.product_id IS NOT DISTINCT FROM base.product_id AND pp_s.product_group_operation_id IS NOT DISTINCT FROM base.product_group_operation_id)`,
      planned_end_date: `(SELECT MAX(pp_s.planned_end_date) FROM production_plans pp_s WHERE pp_s.deleted_at IS NULL AND pp_s.order_id = base.order_id AND pp_s.product_id IS NOT DISTINCT FROM base.product_id AND pp_s.product_group_operation_id IS NOT DISTINCT FROM base.product_group_operation_id)`,
    };

    const orderBy = sortMap[sortBy] || "o.order_code";
    const orderDir = sortDirection === "ASC" ? "ASC" : "DESC";

    let whereFilters = ["1=1", "(o.id IS NULL OR o.deleted_at IS NULL)", "(p.id IS NULL OR p.deleted_at IS NULL)"];
    let queryParams = [];

    // Support comma-separated IDs for multi-select filter (e.g. order_id=1,2,3)
    if (order_id) {
      const ids = String(order_id).split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      if (ids.length > 0) {
        queryParams.push(ids);
        whereFilters.push(`base.order_id = ANY($${queryParams.length}::int[])`);
      }
    }
    if (product_id) {
      const ids = String(product_id).split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      if (ids.length > 0) {
        queryParams.push(ids);
        whereFilters.push(`base.product_id = ANY($${queryParams.length}::int[])`);
      }
    }
    if (operation_id) {
      queryParams.push(operation_id);
      whereFilters.push(`pgo.operation_id = $${queryParams.length}`);
    }
    if (startDate) {
      queryParams.push(startDate);
      whereFilters.push(`(
        EXISTS (
          SELECT 1 FROM production_plans pp_f
          WHERE ${ppMatchSql.replace(/pp_m/g, "pp_f")}
            AND pp_f.planned_end_date >= $${queryParams.length}
        ) OR (
          NOT EXISTS (
            SELECT 1 FROM production_plans pp_f2
            WHERE ${ppMatchSql.replace(/pp_m/g, "pp_f2")}
          )
          AND EXISTS (
            SELECT 1 FROM daily_production_ticket_items dti_f
            JOIN daily_production_tickets dt_f ON dti_f.ticket_id = dt_f.id
            WHERE dt_f.deleted_at IS NULL AND (dt_f.status IS NULL OR dt_f.status != 'REJECTED') AND dt_f.ticket_date >= $${queryParams.length}
              AND dti_f.order_id = base.order_id
              AND dti_f.product_id IS NOT DISTINCT FROM base.product_id
              AND dti_f.product_group_operation_id IS NOT DISTINCT FROM base.product_group_operation_id
          )
        )
      )`);
    }
    if (endDate) {
      queryParams.push(endDate);
      whereFilters.push(`(
        EXISTS (
          SELECT 1 FROM production_plans pp_f
          WHERE ${ppMatchSql.replace(/pp_m/g, "pp_f")}
            AND pp_f.planned_start_date <= $${queryParams.length}
        ) OR (
          NOT EXISTS (
            SELECT 1 FROM production_plans pp_f2
            WHERE ${ppMatchSql.replace(/pp_m/g, "pp_f2")}
          )
          AND EXISTS (
            SELECT 1 FROM daily_production_ticket_items dti_f
            JOIN daily_production_tickets dt_f ON dti_f.ticket_id = dt_f.id
            WHERE dt_f.deleted_at IS NULL AND (dt_f.status IS NULL OR dt_f.status != 'REJECTED') AND dt_f.ticket_date <= $${queryParams.length}
              AND dti_f.order_id = base.order_id
              AND dti_f.product_id IS NOT DISTINCT FROM base.product_id
              AND dti_f.product_group_operation_id IS NOT DISTINCT FROM base.product_group_operation_id
          )
        )
      )`);
    }
    if (search) {
      queryParams.push(`%${search}%`);
      whereFilters.push(`(
        o.name ILIKE $${queryParams.length} OR
        o.order_code ILIKE $${queryParams.length} OR
        o.po_customer ILIKE $${queryParams.length} OR
        p.name ILIKE $${queryParams.length} OR
        op.name ILIKE $${queryParams.length}
      )`);
    }

    const whereClause = "WHERE " + whereFilters.join(" AND ");

    // -------------------------------------------------------------------------
    // FIX #1: unique_base — bỏ điều kiện lọc sai mã hàng không có công đoạn.
    //
    // Logic cũ yêu cầu: nếu product_group_operation_id IS NULL thì product phải
    // có product_group_id IS NULL. Điều này loại mất các mã hàng thuộc nhóm hàng
    // nhưng được nhập thủ công (manual) mà không gắn công đoạn.
    //
    // Logic mới: chấp nhận mọi combination (order, product, operation=null) miễn
    // là có ít nhất 1 production_plan HOẶC 1 manual ticket ghi nhận combination đó.
    // GROUP BY trong base_items đã đảm bảo unique — không cần filter thêm.
    // -------------------------------------------------------------------------
    const baseCombinationsQuery = `
      WITH base_items AS (
        SELECT order_id, product_id, product_group_operation_id
        FROM production_plans
        WHERE deleted_at IS NULL
        GROUP BY order_id, product_id, product_group_operation_id

        UNION

        SELECT dti.order_id, dti.product_id, dti.product_group_operation_id
        FROM daily_production_ticket_items dti
        JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
        WHERE dt.deleted_at IS NULL AND (dt.status IS NULL OR dt.status != 'REJECTED')
          AND dti.production_plan_id IS NULL
        GROUP BY dti.order_id, dti.product_id, dti.product_group_operation_id
      ),
      unique_base AS (
        -- FIX #1: Bỏ điều kiện "product_group_id IS NULL" — chấp nhận mọi combination
        SELECT order_id, product_id, product_group_operation_id
        FROM base_items
        GROUP BY order_id, product_id, product_group_operation_id
      )
      SELECT
        base.order_id,
        base.product_id,
        base.product_group_operation_id,
        (SELECT MAX(pp_rep.id) FROM production_plans pp_rep WHERE ${ppMatchSql.replace(/pp_m/g, "pp_rep")}) as pp_id,
        o.order_code, o.name as order_name, o.po_customer,
        p.name as product_name, pgo.sequence_order,
        pg.name as product_group_name,
        CASE
          WHEN base.product_group_operation_id IS NOT NULL THEN op.name
          ELSE NULL
        END as operation_name,
        COALESCE(
          (
            SELECT string_agg(DISTINCT COALESCE(m_agg.name, m_agg.code), ', ' ORDER BY COALESCE(m_agg.name, m_agg.code))
            FROM production_plans pp_agg
            JOIN machines m_agg ON pp_agg.machine_id = m_agg.id
            WHERE ${ppMatchSql.replace(/pp_m/g, "pp_agg")}
          ),
          (SELECT m_pgo.name FROM machines m_pgo WHERE m_pgo.id = pgo.machine_id)
        ) as machine_name,
        COALESCE(op_qty.quantity, o.quantity, 0) as plan_quantity,
        (
          SELECT MAX(pp_agg.inventory_input)
          FROM production_plans pp_agg
          WHERE ${ppMatchSql.replace(/pp_m/g, "pp_agg")}
        ) as inventory_input,
        (
          SELECT COALESCE(SUM(pp_agg.total_required_work), 0)
          FROM production_plans pp_agg
          WHERE ${ppMatchSql.replace(/pp_m/g, "pp_agg")}
        ) as total_required_work,
        (
          SELECT MIN(pp_agg.planned_start_date)
          FROM production_plans pp_agg
          WHERE ${ppMatchSql.replace(/pp_m/g, "pp_agg")}
        ) as planned_start_date,
        (
          SELECT MAX(pp_agg.planned_end_date)
          FROM production_plans pp_agg
          WHERE ${ppMatchSql.replace(/pp_m/g, "pp_agg")}
        ) as planned_end_date,
        COALESCE(
          (
            SELECT MAX(pp_agg.dinh_muc)
            FROM production_plans pp_agg
            WHERE ${ppMatchSql.replace(/pp_m/g, "pp_agg")}
          ),
          pgo.dinh_muc
        ) as dinh_muc,
        (
            SELECT json_agg(json_build_object(
                'working_date', ppd.working_date,
                'planned_quantity', ppd.planned_work_quantity,
                'dinh_muc', COALESCE(pp_agg.dinh_muc, pgo_sub.dinh_muc)
            ))
            FROM production_plan_days ppd
            JOIN production_plans pp_agg ON ppd.production_plan_id = pp_agg.id
            LEFT JOIN product_group_operations pgo_sub ON pp_agg.product_group_operation_id = pgo_sub.id
            WHERE ${ppMatchSql.replace(/pp_m/g, "pp_agg")}
            AND ppd.deleted_at IS NULL
            ) as plan_days,
        (
            SELECT json_agg(json_build_object(
                'ticket_date', dt.ticket_date,
                'actual_quantity', dti.actual_quantity
            ))
            FROM daily_production_ticket_items dti
            JOIN daily_production_tickets dt ON dt.id = dti.ticket_id
            WHERE dt.deleted_at IS NULL AND (dt.status IS NULL OR dt.status != 'REJECTED')
              AND dti.order_id = base.order_id
              AND dti.product_id IS NOT DISTINCT FROM base.product_id
              AND dti.product_group_operation_id IS NOT DISTINCT FROM base.product_group_operation_id
        ) as actual_tickets
      FROM unique_base base
      LEFT JOIN orders o ON base.order_id = o.id
      LEFT JOIN products p ON base.product_id = p.id
      LEFT JOIN product_groups pg ON p.product_group_id = pg.id
      LEFT JOIN product_group_operations pgo ON base.product_group_operation_id = pgo.id
      LEFT JOIN operations op ON pgo.operation_id = op.id
      LEFT JOIN order_products op_qty ON op_qty.order_id = base.order_id AND op_qty.product_id = base.product_id
      ${whereClause}
      ORDER BY ${orderBy} ${orderDir}, pgo.sequence_order ASC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    // -------------------------------------------------------------------------
    // FIX #3: countQuery — thêm LEFT JOIN orders, products, product_group_operations,
    // operations để whereClause có thể filter theo o.*, p.*, op.* mà không bị lỗi.
    // -------------------------------------------------------------------------
    const countQuery = `
      WITH base_items AS (
        SELECT order_id, product_id, product_group_operation_id
        FROM production_plans
        WHERE deleted_at IS NULL
        GROUP BY order_id, product_id, product_group_operation_id

        UNION

        SELECT dti.order_id, dti.product_id, dti.product_group_operation_id
        FROM daily_production_ticket_items dti
        JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
        WHERE dt.deleted_at IS NULL AND (dt.status IS NULL OR dt.status != 'REJECTED')
          AND dti.production_plan_id IS NULL
        GROUP BY dti.order_id, dti.product_id, dti.product_group_operation_id
      ),
      unique_base AS (
        -- FIX #1 (count): cùng logic với query chính
        SELECT order_id, product_id, product_group_operation_id
        FROM base_items
        GROUP BY order_id, product_id, product_group_operation_id
      )
      SELECT COUNT(*) as total
      FROM unique_base base
      -- FIX #3: bổ sung các JOIN còn thiếu để whereClause hoạt động đúng
      LEFT JOIN orders o ON base.order_id = o.id
      LEFT JOIN products p ON base.product_id = p.id
      LEFT JOIN product_group_operations pgo ON base.product_group_operation_id = pgo.id
      LEFT JOIN operations op ON pgo.operation_id = op.id
      ${whereClause}
    `;

    const countRes = await pool.query(countQuery, queryParams);
    const total = parseInt(countRes.rows[0].total);

    const result = await pool.query(baseCombinationsQuery, [...queryParams, parseInt(limit), offset]);

    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Get Plan Vs Actual Report Error:", error);
    res.status(500).json({ message: "Error retrieving report", error: error.message, stack: error.stack });
  }
};

// POST /api/daily-tickets/auto-generate
// Trigger thủ công việc tự động lập phiếu sản xuất cho 1 ngày cụ thể
// Body: { date?: "YYYY-MM-DD" }  — nếu không truyền date thì dùng ngày hôm nay
export const triggerAutoGenerate = async (req, res) => {
  try {
    const { date } = req.body;

    // Default là ngày hôm nay theo giờ Việt Nam nếu không truyền date
    const targetDate =
      date ||
      new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

    // Validate format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Use YYYY-MM-DD." });
    }

    const result = await generateDailyTickets(targetDate);

    res.json({
      message: `Auto-generation completed for ${targetDate}`,
      date: targetDate,
      created: result.created,
      skipped: result.skipped,
      ticketIds: result.ticketIds,
    });
  } catch (error) {
    console.error("Trigger Auto-Generate Error:", error);
    res
      .status(500)
      .json({ message: "Error during auto-generation", error: error.message });
  }
};

function buildLaborFields(item) {
  const startTime = item.start_time || null;
  const endTime = item.end_time || null;
  const workerCount = item.worker_count ? parseInt(item.worker_count) : null;

  if (!startTime || !endTime || !workerCount || workerCount <= 0) {
    return { startTime: null, endTime: null, workerCount: null, validWorkMinutes: null, actualLabor: null };
  }

  const validWorkMinutes = calculateValidWorkMinutes(startTime, endTime);
  if (validWorkMinutes <= 0) {
    return { startTime, endTime, workerCount, validWorkMinutes: 0, actualLabor: 0 };
  }

  const actualLabor = calculateActualLabor(validWorkMinutes, workerCount);
  return { startTime, endTime, workerCount, validWorkMinutes, actualLabor };
}

// POST /api/daily-tickets/manual-output
// Nhập sản lượng thực tế trực tiếp từ đơn hàng/mã hàng, không cần phiếu có sẵn.
// Mỗi lần gọi API tạo một phiếu is_manual=true mới cho ngày đó.
export const manualOutputEntry = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { ticket_date, items, target_ticket_id } = req.body; // items: [{ order_id, product_id, ... }]
    const user_id = req.user.id;

    if (!ticket_date || !items || items.length === 0) {
      return res.status(400).json({ message: "ticket_date và items là bắt buộc" });
    }

    for (const item of items) {
      if (!item.product_id) {
        return res.status(400).json({ message: "Mỗi dòng phải chọn mã hàng" });
      }
    }

    // Check permission instead of hardcoding 'PLANNER'
    const hasAutoApprove = req.user.role_name === 'ADMIN' || (req.user.permissions || []).includes('daily_tickets:auto_approve');
    const ticketStatus = hasAutoApprove ? 'APPROVED' : 'PENDING_APPROVAL';

    let ticketId;
    if (target_ticket_id) {
      const existing = await client.query(
        `SELECT id FROM daily_production_tickets
         WHERE id = $1 AND is_manual = true AND deleted_at IS NULL AND status != 'COMPLETED'
           AND ticket_date = $2 AND created_by = $3`,
        [target_ticket_id, ticket_date, user_id]
      );
      if (existing.rowCount === 0) {
        return res.status(400).json({ message: "Phiếu không tồn tại hoặc không thể bổ sung dòng" });
      }
      ticketId = existing.rows[0].id;
      await client.query(
        `UPDATE daily_production_tickets SET modified_by = $2, modified_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [ticketId, user_id]
      );
      if (!hasAutoApprove) {
        await client.query("UPDATE daily_production_tickets SET status = 'PENDING_APPROVAL' WHERE id = $1", [ticketId]);
      }
    } else {
      const newTicket = await client.query(
        `INSERT INTO daily_production_tickets (ticket_date, is_manual, created_by, modified_by, status)
         VALUES ($1, true, $2, $2, $3) RETURNING id`,
        [ticket_date, user_id, ticketStatus]
      );
      ticketId = newTicket.rows[0].id;
    }

    // Chèn items vào phiếu
    if (items.length > 0) {
      // Mo rong tu 8 len 13 tham so moi item (them: start_time, end_time, worker_count, valid_work_minutes, actual_labor)
      const itemValues = items
        .map((_, i) =>
          `($1, $${i * 13 + 2}, $${i * 13 + 3}, $${i * 13 + 4}, $${i * 13 + 5}, ` +
          `$${i * 13 + 6}, $${i * 13 + 7}, $${i * 13 + 8}, $${i * 13 + 9}, ` +
          `$${i * 13 + 10}, $${i * 13 + 11}, $${i * 13 + 12}, $${i * 13 + 13}, $${i * 13 + 14})`
        )
        .join(', ');

      const itemParams = [
        ticketId,
        ...items.flatMap(item => {
          const labor = buildLaborFields(item);
          return [
            toIntOrNull(item.order_id),
            toIntOrNull(item.product_id),
            toIntOrNull(item.product_group_operation_id),
            toIntOrNull(item.product_group_operation_id) ? null : (item.operation_name || null),
            parseFloat(item.planned_quantity) || 0,
            parseFloat(item.actual_quantity) || 0,
            item.notes ? String(item.notes) : null,
            null,                        // production_plan_id
            labor.startTime,
            labor.endTime,
            labor.workerCount,
            labor.validWorkMinutes,
            labor.actualLabor,
          ];
        }),
      ];

      await client.query(
        `INSERT INTO daily_production_ticket_items
           (ticket_id, order_id, product_id, product_group_operation_id, operation_name,
            planned_quantity, actual_quantity, notes, production_plan_id,
            start_time, end_time, worker_count, valid_work_minutes, actual_labor)
         VALUES ${itemValues}`,
        itemParams,
      );
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id)
       VALUES ($1, 'MANUAL_OUTPUT', 'DailyProductionTicket', $2)`,
      [user_id, ticketId]
    );

    await client.query("COMMIT");

    // Emit socket notification if needed
    if (ticketStatus === 'PENDING_APPROVAL') {
      try {
        const message = `Tài khoản ${req.user.full_name || req.user.username} vừa tạo phiếu thủ công #${ticketId} cần phê duyệt!`;

        // Save notification to DB for PLANNERs
        await pool.query(
          `INSERT INTO notifications (target_role, message, link) VALUES ($1, $2, $3)`,
          ['PLANNER', message, '/daily-tickets/approval']
        );

        const io = getIo();
        io.to('planners_room').emit('new_pending_ticket', {
          ticket_id: ticketId,
          creator_name: req.user.full_name || req.user.username,
          message
        });
      } catch (err) {
        console.error("Socket emit error:", err);
      }
    }

    const dateKey = String(ticket_date).replace(/-/g, "");
    const displayCode = `${dateKey}U${user_id}#${ticketId}`;

    res.status(201).json({
      message: "Đã ghi nhận sản lượng thủ công!",
      ticket_id: ticketId,
      display_code: displayCode,
      created_by: user_id,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Manual Output Entry Error:", error);
    res.status(500).json({ message: "Lỗi khi ghi nhận sản lượng thủ công", error: error.message });
  } finally {
    client.release();
  }
};

// GET /api/daily-tickets/export/detailed
export const exportDetailedTickets = async (req, res) => {
  try {
    const { startDate, endDate, search, ticket_status, ids, created_by, factory_id } = req.query;

    let whereClause = "WHERE dt.deleted_at IS NULL AND (o.id IS NULL OR o.deleted_at IS NULL) AND (p.id IS NULL OR p.deleted_at IS NULL)";
    const queryParams = [];

    if (ids) {
      const idList = ids.split(",").map((id) => parseInt(id));
      queryParams.push(idList);
      whereClause += ` AND dt.id = ANY($${queryParams.length})`;
    } else {
      if (startDate) {
        queryParams.push(startDate);
        whereClause += ` AND dt.ticket_date >= $${queryParams.length}`;
      }
      if (endDate) {
        queryParams.push(endDate);
        whereClause += ` AND dt.ticket_date <= $${queryParams.length}`;
      }
      if (ticket_status && ticket_status !== "ALL") {
        queryParams.push(ticket_status);
        whereClause += ` AND dt.status = $${queryParams.length}`;
      }
      if (search) {
        queryParams.push(`%${search}%`);
        whereClause += ` AND (o.name ILIKE $${queryParams.length} OR o.po_customer ILIKE $${queryParams.length} OR p.name ILIKE $${queryParams.length})`;
      }
      if (created_by) {
        queryParams.push(parseInt(created_by, 10));
        whereClause += ` AND dt.created_by = $${queryParams.length}`;
      }
      if (factory_id) {
        queryParams.push(parseInt(factory_id, 10));
        whereClause += ` AND dt.machine_id IN (SELECT id FROM machines WHERE factory_id = $${queryParams.length})`;
      }
    }

    const result = await pool.query(
      `
            SELECT
                dt.id as master_id,
                dt.status as ticket_status,
                dt.ticket_date,
                dt.is_manual,
                m.name as machine_name,
                o.order_code,
                o.name as order_name,
                o.po_customer,
                p.name as product_name,
                COALESCE(op.name, dti.operation_name) as operation_name,
                dti.planned_quantity,
                dti.actual_quantity,
                dti.notes,
                dti.actual_notes,
                dti.start_time,
                dti.end_time,
                COALESCE(pp.dinh_muc, pgo.dinh_muc) as dinh_muc,
                COALESCE(cu.full_name, cu.username, 'Hệ thống') as creator_name,
                dt.created_at
            FROM daily_production_tickets dt
            JOIN daily_production_ticket_items dti ON dti.ticket_id = dt.id
            LEFT JOIN orders o ON dti.order_id = o.id
            LEFT JOIN products p ON dti.product_id = p.id
            LEFT JOIN product_group_operations pgo ON dti.product_group_operation_id = pgo.id
            LEFT JOIN operations op ON pgo.operation_id = op.id
            LEFT JOIN machines m ON dt.machine_id = m.id
            LEFT JOIN users cu ON dt.created_by = cu.id
            LEFT JOIN production_plans pp ON pp.id = COALESCE(
                dti.production_plan_id,
                (SELECT id FROM production_plans
                 WHERE order_id = dti.order_id
                   AND product_id = dti.product_id
                   AND product_group_operation_id = dti.product_group_operation_id
                   AND deleted_at IS NULL
                 LIMIT 1)
            )
            ${whereClause}
            ORDER BY dt.ticket_date DESC, dt.id DESC, dti.id ASC
        `,
      queryParams
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Export Daily Tickets Error:", error);
    res.status(500).json({ message: "Error exporting daily tickets", error });
  }
};
