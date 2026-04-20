import pool from "../../config/db.js";

// Lấy chi tiết từng item (Dành cho Export Excel)
export const exportDetailedItems = async (req, res) => {
  try {
    const { type, search = "", order_id, product_id } = req.query;

    let whereClause = "WHERE t.deleted_at IS NULL";
    const queryParams = [];

    if (type) {
      queryParams.push(type);
      whereClause += ` AND t.type = $${queryParams.length}`;
    }

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (t.ticket_code ILIKE $${queryParams.length} OR s.name ILIKE $${queryParams.length})`;
    }

    if (order_id) {
      queryParams.push(order_id);
      whereClause += ` AND i.order_id = $${queryParams.length}`;
    }

    if (product_id) {
      queryParams.push(product_id);
      whereClause += ` AND i.product_id = $${queryParams.length}`;
    }

    const dataQuery = `
      SELECT 
        t.dispatch_date,
        t.ticket_code,
        COALESCE(NULLIF(BTRIM(CONCAT_WS(' - ', o.order_code, o.name)), ' - '), o.order_code, o.name) as order_display,
        p.name as product_name,
        i.order_quantity,
        i.processing_type,
        i.package_count,
        i.quantity_out,
        i.unit_net_weight,
        i.gross_weight,
        i.pallet_weight,
        i.net_weight,
        i.notes,
        t.expected_return_date,
        (SELECT MAX(returned_at) FROM outsourcing_returns r WHERE r.ticket_item_id = i.id) as last_returned_at,
        (SELECT SUM(quantity_returned) FROM outsourcing_returns r WHERE r.ticket_item_id = i.id) as total_returned
      FROM outsourcing_ticket_items i
      JOIN outsourcing_tickets t ON i.ticket_id = t.id
      LEFT JOIN suppliers s ON t.supplier_id = s.id
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN products p ON i.product_id = p.id
      ${whereClause}
      ORDER BY t.created_at DESC, i.id ASC
    `;

    const result = await pool.query(dataQuery, queryParams);
    res.json(result.rows);
  } catch (error) {
    console.error("Export Detailed Items Error:", error);
    res.status(500).json({ message: "Error retrieving export data" });
  }
};

// Lấy danh sách phiếu (Outbound / All)
export const getTickets = async (req, res) => {
  try {
    const { type, search = "", page = 1, limit = 10, order_id, product_id } = req.query;
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
      whereClause += ` AND (t.ticket_code ILIKE $${queryParams.length} OR s.name ILIKE $${queryParams.length})`;
    }

    if (order_id) {
      queryParams.push(order_id);
      whereClause += ` AND EXISTS (SELECT 1 FROM outsourcing_ticket_items i WHERE i.ticket_id = t.id AND i.order_id = $${queryParams.length})`;
    }

    if (product_id) {
      queryParams.push(product_id);
      whereClause += ` AND EXISTS (SELECT 1 FROM outsourcing_ticket_items i WHERE i.ticket_id = t.id AND i.product_id = $${queryParams.length})`;
    }

    const countQuery = `
      SELECT COUNT(*)
      FROM outsourcing_tickets t
      LEFT JOIN suppliers s ON t.supplier_id = s.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT t.*, s.name as supplier, COALESCE(cu.full_name, cu.username) as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name,
             COALESCE((SELECT SUM(quantity_out) FROM outsourcing_ticket_items i WHERE i.ticket_id = t.id), 0) as quantity_out,
             COALESCE((SELECT SUM(package_count) FROM outsourcing_ticket_items i WHERE i.ticket_id = t.id), 0) as total_packages,
             COALESCE((SELECT SUM(r.quantity_returned) FROM outsourcing_returns r JOIN outsourcing_ticket_items i ON r.ticket_item_id = i.id WHERE i.ticket_id = t.id), 0) as total_returned,
             (SELECT string_agg(DISTINCT p.name, ', ') FROM outsourcing_ticket_items i JOIN products p ON i.product_id = p.id WHERE i.ticket_id = t.id) as product_name,
             (SELECT string_agg(DISTINCT NULLIF(BTRIM(CONCAT_WS(' - ', NULLIF(o.order_code, ''), o.name)), ''), ', ') FROM outsourcing_ticket_items i JOIN orders o ON i.order_id = o.id WHERE i.ticket_id = t.id) as order_code,
             (SELECT string_agg(DISTINCT i.packing_specification, '; ') FROM outsourcing_ticket_items i WHERE i.ticket_id = t.id) as packing_specification
      FROM outsourcing_tickets t
      LEFT JOIN suppliers s ON t.supplier_id = s.id
      LEFT JOIN users cu ON t.created_by = cu.id
      LEFT JOIN users mu ON t.modified_by = mu.id
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
      SELECT t.*, s.name as supplier, COALESCE(cu.full_name, cu.username) as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name,
             COALESCE((SELECT SUM(quantity_out) FROM outsourcing_ticket_items i WHERE i.ticket_id = t.id), 0) as quantity_out,
             COALESCE((SELECT SUM(r.quantity_returned) FROM outsourcing_returns r JOIN outsourcing_ticket_items i ON r.ticket_item_id = i.id WHERE i.ticket_id = t.id), 0) as total_returned,
             (SELECT string_agg(DISTINCT p.name, ', ') FROM outsourcing_ticket_items i JOIN products p ON i.product_id = p.id WHERE i.ticket_id = t.id) as product_name,
             (SELECT string_agg(DISTINCT o.order_code, ', ') FROM outsourcing_ticket_items i JOIN orders o ON i.order_id = o.id WHERE i.ticket_id = t.id) as order_name
      FROM outsourcing_tickets t
      LEFT JOIN suppliers s ON t.supplier_id = s.id
      LEFT JOIN users cu ON t.created_by = cu.id
      LEFT JOIN users mu ON t.modified_by = mu.id
      WHERE t.ticket_code = $1 AND t.deleted_at IS NULL
    `;
    const result = await pool.query(dataQuery, [ticket_code]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    const ticket = result.rows[0];

    // Get items
    const itemsQuery = `
        SELECT i.*, p.name as product_name, o.order_code, o.name as order_name,
            COALESCE((SELECT sum(quantity_returned) FROM outsourcing_returns r WHERE r.ticket_item_id = i.id), 0) as total_returned
        FROM outsourcing_ticket_items i
        JOIN products p ON i.product_id = p.id
        JOIN orders o ON i.order_id = o.id
        WHERE i.ticket_id = $1
    `;
    const itemsResult = await pool.query(itemsQuery, [ticket.id]);
    ticket.items = itemsResult.rows;

    // Get return history
    const historyQuery = `
      SELECT r.*, u.username as created_by_username, p.name as product_name
      FROM outsourcing_returns r
      LEFT JOIN users u ON r.created_by = u.id
      JOIN outsourcing_ticket_items i ON r.ticket_item_id = i.id
      JOIN products p ON i.product_id = p.id
      WHERE i.ticket_id = $1
      ORDER BY r.returned_at DESC
    `;
    const historyResult = await pool.query(historyQuery, [ticket.id]);

    res.json({
      ticket,
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
      supplier_id,
      dispatch_date,
      expected_return_date,
      items // array of items
    } = req.body;

    const created_by = req.user.id;

    // Generate auto ticket_code
    let prefix = type === "PLATING" ? "PRO" : "DG";
    
    // Fetch supplier code for PLATING
    if (type === "PLATING" && supplier_id) {
      const supplierRes = await client.query("SELECT code FROM suppliers WHERE id = $1", [supplier_id]);
      if (supplierRes.rowCount > 0) {
        prefix = `PRO-${supplierRes.rows[0].code}`;
      }
    }

    // Determine date for code (NGÀY XUẤT)
    let datePart = "";
    if (dispatch_date) {
      const d = new Date(dispatch_date);
      if (!isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        datePart = `${dd}${mm}${yyyy}`;
      }
    }
    
    if (!datePart) {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();
      datePart = `${dd}${mm}${yyyy}`;
    }

    // Determine ticket code
    let ticket_code = "";
    if (type === "PLATING") {
      ticket_code = `${prefix}-${datePart}`;
    } else {
      // For other types (like PACKAGING), keep the sequence to avoid duplicates
      const countRes = await client.query(
        "SELECT COUNT(*) FROM outsourcing_tickets WHERE ticket_code LIKE $1",
        [`${prefix}-${datePart}-%`]
      );
      const count = parseInt(countRes.rows[0].count) + 1;
      ticket_code = `${prefix}-${datePart}-${count.toString().padStart(3, '0')}`;
    }

    const insertRes = await client.query(
      `INSERT INTO outsourcing_tickets 
        (ticket_code, type, supplier_id, dispatch_date, expected_return_date, created_by, modified_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $6) RETURNING *`,
      [ticket_code, type, supplier_id || null, dispatch_date || null, expected_return_date || null, created_by]
    );

    const newTicket = insertRes.rows[0];

    // Insert items
    if (items && items.length > 0) {
        for (const item of items) {
            await client.query(
                `INSERT INTO outsourcing_ticket_items 
                (ticket_id, order_id, product_id, order_quantity, processing_type, quantity_out, gross_weight, pallet_weight, net_weight, notes, packing_specification, package_count, unit_net_weight)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                [
                  newTicket.id, 
                  item.order_id, 
                  item.product_id, 
                  item.order_quantity || 0, 
                  item.processing_type || null, 
                  item.quantity_out || 0, 
                  item.gross_weight || null, 
                  item.pallet_weight || null, 
                  item.net_weight || null, 
                  item.notes || null,
                  item.packing_specification || null,
                  item.package_count || null,
                  item.unit_net_weight || null
                ]
            );
        }
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'CREATE', 'OutsourcingTicket', $2, $3)`,
      [created_by, newTicket.id, newTicket]
    );

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
    const { ticket_item_id, quantity_returned } = req.body;
    const created_by = req.user.id;

    // Insert return entry
    const insertRes = await client.query(
      `INSERT INTO outsourcing_returns (ticket_item_id, quantity_returned, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [ticket_item_id, quantity_returned, created_by]
    );

    // Update status of main ticket
    // We get sum of all items out and sum of all items returned
    const checkRes = await client.query(
      `SELECT 
        (SELECT COALESCE(SUM(quantity_out), 0) FROM outsourcing_ticket_items WHERE ticket_id = $1) as quantity_out,
        (SELECT COALESCE(SUM(r.quantity_returned), 0) 
         FROM outsourcing_returns r 
         JOIN outsourcing_ticket_items i ON r.ticket_item_id = i.id 
         WHERE i.ticket_id = $1) as total_returned`,
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
        "UPDATE outsourcing_tickets SET status = $1, updated_at = CURRENT_TIMESTAMP, modified_by = $3 WHERE id = $2",
        [newStatus, ticket_id, created_by]
      );
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'CREATE', 'OutsourcingReturn', $2, $3)`,
      [created_by, ticket_id, insertRes.rows[0]]
    );

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
