import pool from "../../config/db.js";

// Lấy danh sách phiếu (Outbound / All)
export const getTickets = async (req, res) => {
  try {
    const { type, search = "", page = 1, limit = 10 } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = (pageInt - 1) * limitInt;

    let whereClause = "WHERE t.deleted_at IS NULL";
    const queryParams = [];

    if (type) {
      queryParams.push(type);
      whereClause += ` AND t.type = $${queryParams.length}`;
    }

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (t.ticket_code ILIKE $${queryParams.length} OR t.supplier ILIKE $${queryParams.length} OR o.order_code ILIKE $${queryParams.length} OR p.name ILIKE $${queryParams.length})`;
    }

    const countQuery = `
      SELECT COUNT(*) 
      FROM outsourcing_tickets t
      LEFT JOIN orders o ON t.order_id = o.id
      LEFT JOIN products p ON t.product_id = p.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT t.*, o.order_code, o.name as order_name, p.name as product_name, u.username as created_by_username,
             COALESCE(
               (SELECT sum(quantity_returned) FROM outsourcing_returns r WHERE r.ticket_id = t.id),
               0
             ) as total_returned
      FROM outsourcing_tickets t
      LEFT JOIN orders o ON t.order_id = o.id
      LEFT JOIN products p ON t.product_id = p.id
      LEFT JOIN users u ON t.created_by = u.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const result = await pool.query(dataQuery, [...queryParams, limitInt, offsetInt]);

    res.json({
      data: result.rows,
      total,
      page: pageInt,
      limit: limitInt
    });
  } catch (error) {
    console.error("Get Tickets Error:", error);
    res.status(500).json({ message: "Error retrieving outsourcing tickets", error });
  }
};

// Lấy 1 phiếu theo mã (Dành cho chức năng Phiếu Về)
export const getTicketByCode = async (req, res) => {
  try {
    const { ticket_code } = req.params;
    const dataQuery = `
      SELECT t.*, o.order_code, o.name as order_name, p.name as product_name, u.username as created_by_username,
             COALESCE(
               (SELECT sum(quantity_returned) FROM outsourcing_returns r WHERE r.ticket_id = t.id),
               0
             ) as total_returned
      FROM outsourcing_tickets t
      LEFT JOIN orders o ON t.order_id = o.id
      LEFT JOIN products p ON t.product_id = p.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.ticket_code = $1 AND t.deleted_at IS NULL
    `;
    const result = await pool.query(dataQuery, [ticket_code]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Get return history
    const historyQuery = `
      SELECT r.*, u.username as created_by_username
      FROM outsourcing_returns r
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.ticket_id = $1
      ORDER BY r.returned_at DESC
    `;
    const historyResult = await pool.query(historyQuery, [result.rows[0].id]);

    res.json({
      ticket: result.rows[0],
      history: historyResult.rows
    });
  } catch (error) {
    console.error("Get Ticket by Code Error:", error);
    res.status(500).json({ message: "Error retrieving ticket", error });
  }
};

// Tạo Phiếu Đi mới
export const createTicket = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      type, // 'PLATING' or 'PACKAGING'
      order_id,
      product_id,
      supplier,
      quantity_out,
      weight_out,
      pieces_out,
      expected_return_date
    } = req.body;

    const created_by = req.user.id;

    // Generate auto ticket_code
    const prefix = type === 'PLATING' ? 'OUT-XM' : 'OUT-DG';
    const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    // Find count of today's tickets
    const countRes = await client.query(
      "SELECT COUNT(*) FROM outsourcing_tickets WHERE ticket_code LIKE $1",
      [`${prefix}-${todayStr}-%`]
    );
    const count = parseInt(countRes.rows[0].count) + 1;
    const ticket_code = `${prefix}-${todayStr}-${count.toString().padStart(3, '0')}`;

    const insertRes = await client.query(
      `INSERT INTO outsourcing_tickets 
        (ticket_code, type, order_id, product_id, supplier, quantity_out, weight_out, pieces_out, expected_return_date, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [ticket_code, type, order_id, product_id, supplier, quantity_out, weight_out || null, pieces_out || null, expected_return_date || null, created_by]
    );

    const newTicket = insertRes.rows[0];

    await client.query("COMMIT");
    res.status(201).json(newTicket);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create Ticket Error:", error);
    res.status(500).json({ message: "Error creating ticket" });
  } finally {
    client.release();
  }
};

// Nhập bổ sung (Phiếu Về)
export const addReturnEntry = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { ticket_id } = req.params;
    const { quantity_returned } = req.body;
    const created_by = req.user.id;

    // Insert return entry
    const insertRes = await client.query(
      `INSERT INTO outsourcing_returns (ticket_id, quantity_returned, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [ticket_id, quantity_returned, created_by]
    );

    // Update status of main ticket
    // Get total returned sum and quantity_out
    const checkRes = await client.query(
      `SELECT t.quantity_out, COALESCE(SUM(r.quantity_returned), 0) as total_returned
       FROM outsourcing_tickets t
       LEFT JOIN outsourcing_returns r ON t.id = r.ticket_id
       WHERE t.id = $1
       GROUP BY t.id`,
      [ticket_id]
    );

    if (checkRes.rowCount > 0) {
      const { quantity_out, total_returned } = checkRes.rows[0];
      let newStatus = 'PENDING';
      if (parseFloat(total_returned) >= parseFloat(quantity_out)) {
        newStatus = 'COMPLETED';
      } else if (parseFloat(total_returned) > 0) {
        newStatus = 'PARTIAL';
      }
      
      await client.query(
        "UPDATE outsourcing_tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [newStatus, ticket_id]
      );
    }

    await client.query("COMMIT");
    res.status(201).json(insertRes.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Add Return Entry Error:", error);
    res.status(500).json({ message: "Error adding return entry" });
  } finally {
    client.release();
  }
};
