import pool from "../../config/db.js";
import { generateDailyTickets } from "../../workers/dailyTicketWorker.js";
import { getIo } from "../../sockets/index.js";

// GET /api/daily-tickets
export const getTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10, startDate, endDate, search, status, is_manual, created_by } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE dt.deleted_at IS NULL AND (o.id IS NULL OR o.deleted_at IS NULL) AND (p.id IS NULL OR p.deleted_at IS NULL)";
    const queryParams = [];

    if (startDate) {
      queryParams.push(startDate);
      whereClause += ` AND dt.ticket_date >= $${queryParams.length}`;
    }
    if (endDate) {
      queryParams.push(endDate);
      whereClause += ` AND dt.ticket_date <= $${queryParams.length}`;
    }
    if (status && status !== "ALL") {
      queryParams.push(status);
      whereClause += ` AND dt.status = $${queryParams.length}`;
    } else if (req.query.exclude_pending === 'true') {
      whereClause += ` AND dt.status NOT IN ('PENDING_APPROVAL', 'REJECTED')`;
    }
    if (is_manual === 'true') {
      whereClause += ` AND dt.is_manual = true`;
    }
    if (created_by) {
      queryParams.push(parseInt(created_by, 10));
      whereClause += ` AND dt.created_by = $${queryParams.length}`;
    }
    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (
        o.name ILIKE $${queryParams.length} OR 
        o.po_customer ILIKE $${queryParams.length} OR 
        p.name ILIKE $${queryParams.length} OR
        CAST(dt.id AS TEXT) ILIKE $${queryParams.length} OR
        cu.username ILIKE $${queryParams.length} OR
        cu.full_name ILIKE $${queryParams.length}
      )`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT dt.id)
       FROM daily_production_tickets dt
       LEFT JOIN daily_production_ticket_items dti ON dti.ticket_id = dt.id
       LEFT JOIN orders o ON dti.order_id = o.id
       LEFT JOIN products p ON dti.product_id = p.id
       LEFT JOIN users cu ON dt.created_by = cu.id
       ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `
            SELECT 
                dt.id as id,
                dt.id as master_id,
                dt.status as ticket_status,
                dt.ticket_date,
                dt.is_manual,
                dt.created_by,
                dt.created_at,
                m.name as machine_name,
                STRING_AGG(DISTINCT o.name, ', ') as order_name,
                STRING_AGG(DISTINCT o.po_customer, ', ') as po_customer,
                STRING_AGG(DISTINCT p.name, ', ') as product_name,
                STRING_AGG(DISTINCT op.name, ', ') as fallback_operation_name,
                STRING_AGG(DISTINCT dti.operation_name, ', ') as operation_name,
                SUM(dti.planned_quantity) as planned_quantity,
                SUM(dti.actual_quantity) as actual_quantity,
                STRING_AGG(DISTINCT dti.notes, '; ') as notes,
                MAX(pp.remaining_quantity) as remaining_quantity,
                COALESCE(cu.full_name, cu.username, 'Hệ thống') as creator_name,
                COALESCE(mu.full_name, mu.username) as modifier_name
            FROM daily_production_tickets dt
            LEFT JOIN daily_production_ticket_items dti ON dti.ticket_id = dt.id
            LEFT JOIN orders o ON dti.order_id = o.id
            LEFT JOIN products p ON dti.product_id = p.id
            LEFT JOIN product_group_operations pgo ON dti.product_group_operation_id = pgo.id
            LEFT JOIN operations op ON pgo.operation_id = op.id
            LEFT JOIN machines m ON dt.machine_id = m.id
            LEFT JOIN production_plans pp ON pp.id = COALESCE(
                dti.production_plan_id,
                (SELECT id FROM production_plans 
                 WHERE order_id = dti.order_id 
                   AND product_id = dti.product_id 
                   AND product_group_operation_id = dti.product_group_operation_id 
                   AND deleted_at IS NULL 
                 LIMIT 1)
            )
            LEFT JOIN users cu ON dt.created_by = cu.id
            LEFT JOIN users mu ON dt.modified_by = mu.id
            ${whereClause}
            GROUP BY 
                dt.id, dt.status, dt.ticket_date, dt.is_manual, dt.created_by, dt.created_at, m.name,
                cu.full_name, cu.username, mu.full_name, mu.username
            ORDER BY dt.ticket_date DESC, dt.id DESC
            LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
        `,
      [...queryParams, limit, offset]
    );

    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get Daily Tickets Error:", error);
    res.status(500).json({ message: "Error retrieving daily tickets", error });
  }
};


// GET /api/daily-tickets/:id
export const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    let ticketRes = await pool.query(
      `SELECT dt.*, m.name as machine_name, COALESCE(cu.full_name, cu.username, 'Hệ thống') as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name
       FROM daily_production_tickets dt
       LEFT JOIN machines m ON dt.machine_id = m.id
       LEFT JOIN users cu ON dt.created_by = cu.id
       LEFT JOIN users mu ON dt.modified_by = mu.id
       WHERE dt.id = $1 AND dt.deleted_at IS NULL`,
      [id]
    );

    // [Refinement] If not found by ticket ID, check if it's an item ID
    if (ticketRes.rowCount === 0) {
      const itemFallback = await pool.query(
        "SELECT ticket_id FROM daily_production_ticket_items WHERE id = $1",
        [id]
      );
      if (itemFallback.rowCount > 0) {
        const fallbackTicketId = itemFallback.rows[0].ticket_id;
        ticketRes = await pool.query(
          `SELECT dt.*, COALESCE(cu.full_name, cu.username, 'Hệ thống') as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name
           FROM daily_production_tickets dt
           LEFT JOIN users cu ON dt.created_by = cu.id
           LEFT JOIN users mu ON dt.modified_by = mu.id
           WHERE dt.id = $1 AND dt.deleted_at IS NULL`,
          [fallbackTicketId]
        );
      }
    }

    if (ticketRes.rowCount === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const ticket = ticketRes.rows[0];

    const itemsRes = await pool.query(
      `SELECT dti.*, 
              o.order_code, o.name as order_name, o.po_customer,
              c.name as customer_name,
              p.name as product_name,
              pg.name as product_group_name,
              op.name as pgo_operation_name,
              m.name as pgo_machine_name,
              pp.remaining_quantity
       FROM daily_production_ticket_items dti
       LEFT JOIN orders o ON dti.order_id = o.id
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN products p ON dti.product_id = p.id
       LEFT JOIN product_groups pg ON p.product_group_id = pg.id
       LEFT JOIN product_group_operations pgo ON dti.product_group_operation_id = pgo.id
       LEFT JOIN operations op ON pgo.operation_id = op.id
       LEFT JOIN machines m ON pgo.machine_id = m.id
       LEFT JOIN production_plans pp ON pp.id = COALESCE(
            dti.production_plan_id,
            (SELECT id FROM production_plans 
             WHERE order_id = dti.order_id 
               AND product_id = dti.product_id 
               AND product_group_operation_id = dti.product_group_operation_id 
               AND deleted_at IS NULL 
             LIMIT 1)
        )
       WHERE dti.ticket_id = $1`,
      [id]
    );

    ticket.items = itemsRes.rows;

    res.json(ticket);
  } catch (error) {
    console.error("Get Daily Ticket By ID Error:", error);
    res.status(500).json({ message: "Error retrieving daily ticket details", error });
  }
};

// POST /api/daily-tickets
export const createTicket = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { ticket_date, items, is_manual } = req.body;
    const created_by = req.user.id;

    const ticketInsert = await client.query(
      `INSERT INTO daily_production_tickets (ticket_date, is_manual, created_by, modified_by)
       VALUES ($1, $2, $3, $3) RETURNING *`,
      [ticket_date, is_manual || false, created_by]
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
          item.operation_name || null,
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
          item.order_id || null,
          item.product_id || null,
          item.product_group_operation_id || null,
          item.operation_name || null,
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
      const itemIds = items.map(i => parseInt(i.id));
      const actualQtys = items.map(i => parseFloat(i.actual_quantity) || 0);
      const notesArr = items.map(i => i.notes ? String(i.notes) : null);
      await client.query(
        `UPDATE daily_production_ticket_items AS dti
         SET actual_quantity = v.qty, notes = v.note, updated_at = CURRENT_TIMESTAMP
         FROM (SELECT unnest($1::int[]) AS id, unnest($2::numeric[]) AS qty, unnest($4::text[]) AS note) AS v
         WHERE dti.id = v.id AND dti.ticket_id = $3`,
        [itemIds, actualQtys, id, notesArr],
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

// PUT /api/daily-tickets/:id/approve
export const approveTicket = async (req, res) => {
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

    if (ticketRes.rows[0].status === "COMPLETED") {
      return res.status(400).json({ message: "Cannot approve a completed ticket!" });
    }

    await client.query(
      "UPDATE daily_production_tickets SET status = 'APPROVED', updated_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1",
      [id, user_id]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id)
       VALUES ($1, 'APPROVE', 'DailyProductionTicket', $2)`,
      [user_id, id]
    );

    await client.query("COMMIT");
    res.json({ message: "Ticket approved successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Approve Ticket Error:", error);
    res.status(500).json({ message: "Error approving ticket", error });
  } finally {
    client.release();
  }
};

// PUT /api/daily-tickets/:id/reject
export const rejectTicket = async (req, res) => {
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

    if (ticketRes.rows[0].status === "COMPLETED") {
      return res.status(400).json({ message: "Cannot reject a completed ticket!" });
    }

    await client.query(
      "UPDATE daily_production_tickets SET status = 'REJECTED', updated_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1",
      [id, user_id]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id)
       VALUES ($1, 'REJECT', 'DailyProductionTicket', $2)`,
      [user_id, id]
    );

    await client.query("COMMIT");
    res.json({ message: "Ticket rejected successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Reject Ticket Error:", error);
    res.status(500).json({ message: "Error rejecting ticket", error });
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

    // Map frontend sort keys to database columns
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

    if (order_id) {
      queryParams.push(order_id);
      whereFilters.push(`base.order_id = $${queryParams.length}`);
    }
    if (product_id) {
      queryParams.push(product_id);
      whereFilters.push(`base.product_id = $${queryParams.length}`);
    }
    if (operation_id) {
      queryParams.push(operation_id);
      whereFilters.push(`pgo.operation_id = $${queryParams.length}`);
    }
    if (startDate) {
      queryParams.push(startDate);
      // Nếu có KH thì lọc theo ngày KH (mọi máy), nếu không có KH (manual) thì lọc theo ngày ghi nhận thực tế
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
            WHERE dt_f.deleted_at IS NULL AND dt_f.ticket_date >= $${queryParams.length}
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
            WHERE dt_f.deleted_at IS NULL AND dt_f.ticket_date <= $${queryParams.length}
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

    // Gộp theo (Order, Product, Operation) — cộng dồn mọi kế hoạch máy (1 công đoạn / nhiều máy)
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
        WHERE dt.deleted_at IS NULL
          AND dti.production_plan_id IS NULL
        GROUP BY dti.order_id, dti.product_id, dti.product_group_operation_id
      ),
      unique_base AS (
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
        COALESCE(
          op.name,
          (
            SELECT MAX(dti_sn.operation_name)
            FROM daily_production_ticket_items dti_sn
            JOIN daily_production_tickets dt_sn ON dt_sn.id = dti_sn.ticket_id
            WHERE dt_sn.deleted_at IS NULL
              AND dti_sn.order_id = base.order_id
              AND dti_sn.product_id IS NOT DISTINCT FROM base.product_id
              AND dti_sn.product_group_operation_id IS NOT DISTINCT FROM base.product_group_operation_id
          )
        ) as operation_name,
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
                'planned_quantity', ppd.planned_work_quantity
            ))
            FROM production_plan_days ppd
            JOIN production_plans pp_agg ON ppd.production_plan_id = pp_agg.id
            WHERE ${ppMatchSql.replace(/pp_m/g, "pp_agg")}
        ) as plan_days,
        (
            SELECT json_agg(json_build_object(
                'ticket_date', dt.ticket_date,
                'actual_quantity', dti.actual_quantity
            ))
            FROM daily_production_ticket_items dti
            JOIN daily_production_tickets dt ON dt.id = dti.ticket_id
            WHERE dt.deleted_at IS NULL
              AND (
                dti.production_plan_id IN (
                  SELECT pp_agg.id FROM production_plans pp_agg WHERE ${ppMatchSql.replace(/pp_m/g, "pp_agg")}
                )
                OR (
                  dti.production_plan_id IS NULL
                  AND dti.order_id = base.order_id
                  AND dti.product_id IS NOT DISTINCT FROM base.product_id
                  AND dti.product_group_operation_id IS NOT DISTINCT FROM base.product_group_operation_id
                )
              )
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

    // Count for pagination
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
        WHERE dt.deleted_at IS NULL
          AND dti.production_plan_id IS NULL
        GROUP BY dti.order_id, dti.product_id, dti.product_group_operation_id
      ),
      unique_base AS (
        SELECT order_id, product_id, product_group_operation_id
        FROM base_items
        GROUP BY order_id, product_id, product_group_operation_id
      )
      SELECT COUNT(*) as total 
      FROM unique_base base
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
    res.status(500).json({ message: "Error retrieving report", error });
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
      // if (!item.product_group_operation_id && !item.operation_name) {
      //   return res.status(400).json({ message: "Mỗi dòng phải chọn công đoạn hoặc 'Không công đoạn'" });
      // }
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
      const itemValues = items
        .map((_, i) => `($1, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8}, $${i * 8 + 9})`)
        .join(", ");
      const itemParams = [
        ticketId,
        ...items.flatMap(item => [
          item.order_id || null,
          item.product_id || null,
          item.product_group_operation_id || null,
          item.operation_name || null,
          parseFloat(item.planned_quantity) || 0,
          parseFloat(item.actual_quantity) || 0,
          item.notes ? String(item.notes) : null,
          null // production_plan_id
        ]),
      ];
      await client.query(
        `INSERT INTO daily_production_ticket_items
           (ticket_id, order_id, product_id, product_group_operation_id, operation_name, planned_quantity, actual_quantity, notes, production_plan_id)
           VALUES ${itemValues}`,
        itemParams
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
    const { startDate, endDate, search, ticket_status, ids, created_by } = req.query;

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
                dti.operation_name,
                dti.planned_quantity,
                dti.actual_quantity,
                dti.notes,
                COALESCE(cu.full_name, cu.username, 'Hệ thống') as creator_name,
                dt.created_at
            FROM daily_production_tickets dt
            JOIN daily_production_ticket_items dti ON dti.ticket_id = dt.id
            LEFT JOIN orders o ON dti.order_id = o.id
            LEFT JOIN products p ON dti.product_id = p.id
            LEFT JOIN machines m ON dt.machine_id = m.id
            LEFT JOIN users cu ON dt.created_by = cu.id
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

