import pool from "../../config/db.js";

// GET /api/daily-tickets
export const getTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10, date } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE dt.deleted_at IS NULL";
    const queryParams = [];

    if (date) {
      queryParams.push(date);
      whereClause += ` AND dt.ticket_date = $${queryParams.length}`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM daily_production_tickets dt ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `
            SELECT 
                dt.*,
                COALESCE(cu.full_name, cu.username) as creator_name,
                COALESCE(mu.full_name, mu.username) as modifier_name
            FROM daily_production_tickets dt
            LEFT JOIN users cu ON dt.created_by = cu.id
            LEFT JOIN users mu ON dt.modified_by = mu.id
            ${whereClause}
            ORDER BY dt.ticket_date DESC, dt.created_at DESC
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

    const ticketRes = await pool.query(
      `SELECT dt.*, COALESCE(cu.full_name, cu.username) as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name
       FROM daily_production_tickets dt
       LEFT JOIN users cu ON dt.created_by = cu.id
       LEFT JOIN users mu ON dt.modified_by = mu.id
       WHERE dt.id = $1 AND dt.deleted_at IS NULL`,
      [id]
    );

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
              m.name as pgo_machine_name
       FROM daily_production_ticket_items dti
       LEFT JOIN orders o ON dti.order_id = o.id
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN products p ON dti.product_id = p.id
       LEFT JOIN product_groups pg ON p.product_group_id = pg.id
       LEFT JOIN product_group_operations pgo ON dti.product_group_operation_id = pgo.id
       LEFT JOIN operations op ON pgo.operation_id = op.id
       LEFT JOIN machines m ON pgo.machine_id = m.id
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
    const { ticket_date, items } = req.body;
    const created_by = req.user.id;

    const ticketInsert = await client.query(
      `INSERT INTO daily_production_tickets (ticket_date, created_by, modified_by)
       VALUES ($1, $2, $2) RETURNING *`,
      [ticket_date, created_by]
    );
    const newTicket = ticketInsert.rows[0];

    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO daily_production_ticket_items 
           (ticket_id, order_id, product_id, product_group_operation_id, operation_name, planned_quantity)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newTicket.id,
            item.order_id || null,
            item.product_id || null,
            item.product_group_operation_id || null,
            item.operation_name || null,
            item.planned_quantity || 0,
          ]
        );
      }
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
    const { ticket_date, items } = req.body;
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
      "UPDATE daily_production_tickets SET ticket_date = $1, updated_at = CURRENT_TIMESTAMP, modified_by = $3, modified_time = CURRENT_TIMESTAMP WHERE id = $2",
      [ticket_date, id, user_id]
    );

    // Re-create items (since logic is to only edit un-completed tickets)
    await client.query("DELETE FROM daily_production_ticket_items WHERE ticket_id = $1", [id]);

    if (items && items.length > 0) {
      for (const item of items) {
        await client.query(
          `INSERT INTO daily_production_ticket_items 
           (ticket_id, order_id, product_id, product_group_operation_id, operation_name, planned_quantity)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            id,
            item.order_id || null,
            item.product_id || null,
            item.product_group_operation_id || null,
            item.operation_name || null,
            item.planned_quantity || 0,
          ]
        );
      }
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

    for (const item of items) {
       await client.query(
         "UPDATE daily_production_ticket_items SET actual_quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND ticket_id = $3",
         [item.actual_quantity, item.id, id]
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

// GET /api/v1/daily-tickets/report/plan-vs-actual
export const getPlanVsActualReport = async (req, res) => {
  try {
    const { order_id } = req.query;
    
    let whereClause = "WHERE pp.deleted_at IS NULL";
    let queryParams = [];
    if (order_id) {
       queryParams.push(order_id);
       whereClause += ` AND pp.order_id = $${queryParams.length}`;
    }

    const queryInfo = `
      SELECT 
        pp.id,
        pp.order_id,
        pp.product_id,
        pp.product_group_operation_id,
        o.name as order_name,
        p.name as product_name,
        pg.name as product_group_name,
        op.name as operation_name,
        m.name as machine_name,
        COALESCE(op_qty.quantity, o.quantity, 0) as plan_quantity,
        pp.inventory_input,
        pp.remaining_quantity,
        pp.total_required_work,
        pp.planned_start_date,
        pp.planned_end_date,
        COALESCE(pp.dinh_muc, pgo.dinh_muc) as dinh_muc,
        pgo.sequence_order,
        (
            SELECT json_agg(json_build_object(
                'working_date', ppd.working_date,
                'planned_quantity', ppd.planned_work_quantity,
                'is_overtime', ppd.is_overtime
            ))
            FROM production_plan_days ppd
            WHERE ppd.production_plan_id = pp.id
        ) as plan_days,
        (
            SELECT json_agg(json_build_object(
                'ticket_date', dt.ticket_date,
                'actual_quantity', dti.actual_quantity
            ))
            FROM daily_production_ticket_items dti
            JOIN daily_production_tickets dt ON dt.id = dti.ticket_id
            WHERE dti.order_id = pp.order_id 
              AND (dti.product_id IS NOT DISTINCT FROM pp.product_id)
              AND (dti.product_group_operation_id IS NOT DISTINCT FROM pp.product_group_operation_id)
              AND dt.deleted_at IS NULL
              AND dt.status = 'COMPLETED'
        ) as actual_tickets
      FROM production_plans pp
      LEFT JOIN orders o ON pp.order_id = o.id
      LEFT JOIN products p ON pp.product_id = p.id
      LEFT JOIN product_groups pg ON p.product_group_id = pg.id
      LEFT JOIN product_group_operations pgo ON pp.product_group_operation_id = pgo.id
      LEFT JOIN operations op ON pgo.operation_id = op.id
      LEFT JOIN machines m ON COALESCE(pp.machine_id, pgo.machine_id) = m.id
      LEFT JOIN order_products op_qty ON op_qty.order_id = pp.order_id AND op_qty.product_id = pp.product_id
      ${whereClause}
      ORDER BY o.order_code DESC, p.name ASC, pgo.sequence_order ASC
    `;

    const result = await pool.query(queryInfo, queryParams);
    
    res.json({
       data: result.rows
    });
  } catch (error) {
    console.error("Get Plan Vs Actual Report Error:", error);
    res.status(500).json({ message: "Error retrieving report", error });
  }
};
