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
      WITH returns_agg AS (
        SELECT
          r.ticket_item_id,
          MAX(r.returned_at) AS last_returned_at,
          SUM(r.quantity_returned) AS total_returned,
          SUM(r.gross_weight) AS return_gross_weight,
          SUM(r.pallet_weight) AS return_pallet_weight,
          SUM(r.net_weight) AS return_net_weight,
          SUM(r.missing_weight) AS return_missing_weight,
          string_agg(r.notes, '; ' ORDER BY r.returned_at) FILTER (WHERE r.notes IS NOT NULL AND r.notes != '') AS return_notes
        FROM outsourcing_returns r
        GROUP BY r.ticket_item_id
      )
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
        ra.last_returned_at,
        ra.total_returned,
        ra.return_gross_weight,
        ra.return_pallet_weight,
        ra.return_net_weight,
        ra.return_missing_weight,
        ra.return_notes
      FROM outsourcing_ticket_items i
      JOIN outsourcing_tickets t ON i.ticket_id = t.id
      LEFT JOIN suppliers s ON t.supplier_id = s.id
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN returns_agg ra ON ra.ticket_item_id = i.id
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
      WITH ticket_items_agg AS (
        SELECT
          i.ticket_id,
          SUM(i.quantity_out) AS quantity_out,
          SUM(i.package_count) AS total_packages,
          string_agg(DISTINCT p.name, ', ' ORDER BY p.name) AS product_name,
          string_agg(
            DISTINCT NULLIF(BTRIM(CONCAT_WS(' - ', NULLIF(o.order_code, ''), o.name)), ''),
            ', '
            ORDER BY NULLIF(BTRIM(CONCAT_WS(' - ', NULLIF(o.order_code, ''), o.name)), '')
          ) AS order_code,
          string_agg(DISTINCT i.packing_specification, '; ' ORDER BY i.packing_specification) AS packing_specification
        FROM outsourcing_ticket_items i
        LEFT JOIN products p ON i.product_id = p.id
        LEFT JOIN orders o ON i.order_id = o.id
        GROUP BY i.ticket_id
      ),
      ticket_returns_agg AS (
        SELECT
          i.ticket_id,
          SUM(r.quantity_returned) AS total_returned
        FROM outsourcing_returns r
        JOIN outsourcing_ticket_items i ON r.ticket_item_id = i.id
        GROUP BY i.ticket_id
      )
      SELECT
        t.*,
        s.name as supplier,
        COALESCE(cu.full_name, cu.username) as creator_name,
        COALESCE(mu.full_name, mu.username) as modifier_name,
        COALESCE(tia.quantity_out, 0) as quantity_out,
        COALESCE(tia.total_packages, 0) as total_packages,
        COALESCE(tra.total_returned, 0) as total_returned,
        tia.product_name,
        tia.order_code,
        tia.packing_specification
      FROM outsourcing_tickets t
      LEFT JOIN suppliers s ON t.supplier_id = s.id
      LEFT JOIN users cu ON t.created_by = cu.id
      LEFT JOIN users mu ON t.modified_by = mu.id
      LEFT JOIN ticket_items_agg tia ON tia.ticket_id = t.id
      LEFT JOIN ticket_returns_agg tra ON tra.ticket_id = t.id
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
      WITH ticket_match AS (
        SELECT *
        FROM outsourcing_tickets
        WHERE ticket_code = $1 AND deleted_at IS NULL
        LIMIT 1
      ),
      ticket_items_agg AS (
        SELECT
          i.ticket_id,
          SUM(i.quantity_out) AS quantity_out,
          string_agg(DISTINCT p.name, ', ' ORDER BY p.name) AS product_name,
          string_agg(
            DISTINCT NULLIF(BTRIM(CONCAT_WS(' - ', NULLIF(o.order_code, ''), o.name)), ''),
            ', '
            ORDER BY NULLIF(BTRIM(CONCAT_WS(' - ', NULLIF(o.order_code, ''), o.name)), '')
          ) AS order_name
        FROM outsourcing_ticket_items i
        LEFT JOIN products p ON i.product_id = p.id
        LEFT JOIN orders o ON i.order_id = o.id
        WHERE i.ticket_id IN (SELECT id FROM ticket_match)
        GROUP BY i.ticket_id
      ),
      ticket_returns_agg AS (
        SELECT
          i.ticket_id,
          SUM(r.quantity_returned) AS total_returned
        FROM outsourcing_returns r
        JOIN outsourcing_ticket_items i ON r.ticket_item_id = i.id
        WHERE i.ticket_id IN (SELECT id FROM ticket_match)
        GROUP BY i.ticket_id
      )
      SELECT
        t.*,
        s.name as supplier,
        COALESCE(cu.full_name, cu.username) as creator_name,
        COALESCE(mu.full_name, mu.username) as modifier_name,
        COALESCE(tia.quantity_out, 0) as quantity_out,
        COALESCE(tra.total_returned, 0) as total_returned,
        tia.product_name,
        tia.order_name
      FROM ticket_match t
      LEFT JOIN suppliers s ON t.supplier_id = s.id
      LEFT JOIN users cu ON t.created_by = cu.id
      LEFT JOIN users mu ON t.modified_by = mu.id
      LEFT JOIN ticket_items_agg tia ON tia.ticket_id = t.id
      LEFT JOIN ticket_returns_agg tra ON tra.ticket_id = t.id
    `;
    const result = await pool.query(dataQuery, [ticket_code]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    const ticket = result.rows[0];

    // Get items
    const itemsQuery = `
        WITH returns_agg AS (
          SELECT ticket_item_id, SUM(quantity_returned) AS total_returned
          FROM outsourcing_returns
          GROUP BY ticket_item_id
        )
        SELECT
          i.*,
          p.name as product_name,
          o.order_code,
          o.name as order_name,
          COALESCE(ra.total_returned, 0) as total_returned
        FROM outsourcing_ticket_items i
        JOIN products p ON i.product_id = p.id
        JOIN orders o ON i.order_id = o.id
        LEFT JOIN returns_agg ra ON ra.ticket_item_id = i.id
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
      type,
      supplier_id,
      dispatch_date,
      expected_return_date,
      items
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

    // Parse ngày từ chuỗi ISO, tránh lệch múi giờ UTC
    let datePart = "";
    if (dispatch_date) {
      const dateStr = dispatch_date.split("T")[0]; // "2026-05-25"
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const [yyyy, mm, dd] = parts;
        datePart = `${dd}${mm}${yyyy}`; // "25052026"
      }
    }

    if (!datePart) {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, "0");
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const yyyy = now.getFullYear();
      datePart = `${dd}${mm}${yyyy}`;
    }

    // Xác định ticket_code
    let ticket_code = "";
    if (type === "PLATING") {
      const baseCode = `${prefix}-${datePart}`;

      // Kiểm tra trùng mã phiếu
      const existsRes = await client.query(
        "SELECT COUNT(*) FROM outsourcing_tickets WHERE ticket_code LIKE $1",
        [`${baseCode}%`]
      );
      const existsCount = parseInt(existsRes.rows[0].count);

      if (existsCount === 0) {
        ticket_code = baseCode;
      } else {
        ticket_code = `${baseCode}-${(existsCount + 1).toString().padStart(3, "0")}`;
      }
    } else {
      const countRes = await client.query(
        "SELECT COUNT(*) FROM outsourcing_tickets WHERE ticket_code LIKE $1",
        [`${prefix}-${datePart}-%`]
      );
      const count = parseInt(countRes.rows[0].count) + 1;
      ticket_code = `${prefix}-${datePart}-${count.toString().padStart(3, "0")}`;
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
    res.status(500).json({ message: "Error creating ticket", error: error.message });
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
    const { ticket_item_id, quantity_returned, gross_weight, pallet_weight, net_weight, missing_weight, notes } = req.body;
    const created_by = req.user.id;

    const insertRes = await client.query(
      `INSERT INTO outsourcing_returns (ticket_item_id, quantity_returned, gross_weight, pallet_weight, net_weight, missing_weight, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [ticket_item_id, quantity_returned, gross_weight || null, pallet_weight || null, net_weight || null, missing_weight || null, notes || null, created_by]
    );

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
      let newStatus = "PENDING";
      if (parseFloat(total_returned) >= parseFloat(quantity_out)) {
        newStatus = "COMPLETED";
      } else if (parseFloat(total_returned) > 0) {
        newStatus = "PARTIAL";
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

export const updateReturnEntry = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { return_id } = req.params;
    const { quantity_returned, gross_weight, pallet_weight, net_weight, missing_weight, notes } = req.body;
    const modified_by = req.user.id;

    const currentRes = await client.query(
      `SELECT r.*, i.ticket_id FROM outsourcing_returns r
       JOIN outsourcing_ticket_items i ON r.ticket_item_id = i.id
       WHERE r.id = $1`,
      [return_id]
    );

    if (currentRes.rowCount === 0) {
      return res.status(404).json({ message: "Return entry not found" });
    }

    const ticket_id = currentRes.rows[0].ticket_id;

    const updateRes = await client.query(
      `UPDATE outsourcing_returns 
       SET quantity_returned = $1, gross_weight = $2, pallet_weight = $3, net_weight = $4, missing_weight = $5, notes = $6, updated_at = CURRENT_TIMESTAMP, modified_by = $7
       WHERE id = $8 RETURNING *`,
      [quantity_returned || null, gross_weight || null, pallet_weight || null, net_weight || null, missing_weight || null, notes || null, modified_by, return_id]
    );

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
      let newStatus = "PENDING";
      if (parseFloat(total_returned) >= parseFloat(quantity_out)) {
        newStatus = "COMPLETED";
      } else if (parseFloat(total_returned) > 0) {
        newStatus = "PARTIAL";
      }

      await client.query(
        "UPDATE outsourcing_tickets SET status = $1, updated_at = CURRENT_TIMESTAMP, modified_by = $3 WHERE id = $2",
        [newStatus, ticket_id, modified_by]
      );
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'UPDATE', 'OutsourcingReturn', $2, $3)`,
      [modified_by, ticket_id, updateRes.rows[0]]
    );

    await client.query("COMMIT");
    res.json(updateRes.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update Return Entry Error:", error);
    res.status(500).json({ message: "Error updating return entry" });
  } finally {
    client.release();
  }
};

export const deleteReturnEntry = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { return_id } = req.params;
    const deleted_by = req.user.id;

    const currentRes = await client.query(
      `SELECT r.*, i.ticket_id FROM outsourcing_returns r
       JOIN outsourcing_ticket_items i ON r.ticket_item_id = i.id
       WHERE r.id = $1`,
      [return_id]
    );

    if (currentRes.rowCount === 0) {
      return res.status(404).json({ message: "Return entry not found" });
    }

    const ticket_id = currentRes.rows[0].ticket_id;

    await client.query(`DELETE FROM outsourcing_returns WHERE id = $1`, [return_id]);

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
      let newStatus = "PENDING";
      if (parseFloat(total_returned) >= parseFloat(quantity_out)) {
        newStatus = "COMPLETED";
      } else if (parseFloat(total_returned) > 0) {
        newStatus = "PARTIAL";
      }

      await client.query(
        "UPDATE outsourcing_tickets SET status = $1, updated_at = CURRENT_TIMESTAMP, modified_by = $3 WHERE id = $2",
        [newStatus, ticket_id, deleted_by]
      );
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'DELETE', 'OutsourcingReturn', $2, $3)`,
      [deleted_by, ticket_id, JSON.stringify({ deleted_return_id: return_id })]
    );

    await client.query("COMMIT");
    res.json({ message: "Return entry deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete Return Entry Error:", error);
    res.status(500).json({ message: "Error deleting return entry" });
  } finally {
    client.release();
  }
};

// Xóa phiếu gia công
export const deleteTicket = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const user_id = req.user.id;

    const checkRes = await client.query(
      `SELECT t.status, 
        (SELECT COUNT(*) FROM outsourcing_returns r JOIN outsourcing_ticket_items i ON r.ticket_item_id = i.id WHERE i.ticket_id = t.id) as returns_count
       FROM outsourcing_tickets t
       WHERE t.id = $1 AND t.deleted_at IS NULL`,
      [id]
    );

    if (checkRes.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy phiếu hoặc đã bị xoá" });
    }

    if (parseInt(checkRes.rows[0].returns_count) > 0) {
      return res.status(400).json({ message: "Không thể xoá phiếu đã có hàng nhập về" });
    }

    await client.query(
      "UPDATE outsourcing_tickets SET deleted_at = CURRENT_TIMESTAMP, modified_by = $1 WHERE id = $2",
      [user_id, id]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES ($1, 'DELETE', 'OutsourcingTicket', $2)`,
      [user_id, id]
    );

    await client.query("COMMIT");
    res.json({ message: "Xoá phiếu gia công thành công" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete Outsourcing Ticket Error:", error);
    res.status(500).json({ message: "Lỗi khi xoá phiếu", error: error.message });
  } finally {
    client.release();
  }
};

// Cập nhật phiếu gia công
export const updateTicket = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const user_id = req.user.id;
    const { supplier_id, dispatch_date, expected_return_date, items, status, type: ticketType } = req.body;

    const ticketRes = await client.query("SELECT * FROM outsourcing_tickets WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (ticketRes.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy phiếu" });
    }

    await client.query(
      `UPDATE outsourcing_tickets 
       SET supplier_id = $1, dispatch_date = $2, expected_return_date = $3, modified_by = $4,
           type = COALESCE($6, type), status = COALESCE($7, status), updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        supplier_id || null,
        dispatch_date || null,
        expected_return_date || null,
        user_id,
        id,
        ticketType || null,
        status || null
      ]
    );

    if (Array.isArray(items) && items.length > 0) {
      const existingItemsRes = await client.query(
        `SELECT i.id, 
          (SELECT COALESCE(SUM(quantity_returned), 0) FROM outsourcing_returns r WHERE r.ticket_item_id = i.id) as returned_qty
         FROM outsourcing_ticket_items i
         WHERE i.ticket_id = $1`,
        [id]
      );
      const existingItemMap = new Map();
      existingItemsRes.rows.forEach(r => existingItemMap.set(r.id, parseFloat(r.returned_qty)));

      const newProvidedItemIds = new Set(items.map(i => i.id).filter(Boolean));

      for (const [existingId, returnedQty] of existingItemMap.entries()) {
        if (!newProvidedItemIds.has(existingId)) {
          if (returnedQty > 0) {
            throw new Error(`Không thể xoá dòng chi tiết (ID: ${existingId}) vì đã có ${returnedQty} hàng nhập về`);
          }
          await client.query("DELETE FROM outsourcing_ticket_items WHERE id = $1", [existingId]);
        }
      }

      for (const item of items) {
        if (item.id && existingItemMap.has(item.id)) {
          const returnedQty = existingItemMap.get(item.id);
          const quantity_out = parseFloat(item.quantity_out || 0);
          if (quantity_out < returnedQty) {
            throw new Error(`Số lượng xuất không thể nhỏ hơn số lượng đã nhập về (${returnedQty})`);
          }

          await client.query(
            `UPDATE outsourcing_ticket_items
             SET order_id = $1, product_id = $2, order_quantity = $3, processing_type = $4, quantity_out = $5,
                 gross_weight = $6, pallet_weight = $7, net_weight = $8, notes = $9, 
                 packing_specification = $10, package_count = $11, unit_net_weight = $12
             WHERE id = $13`,
            [
              item.order_id, item.product_id, item.order_quantity || 0, item.processing_type || null, quantity_out,
              item.gross_weight || null, item.pallet_weight || null, item.net_weight || null, item.notes || null,
              item.packing_specification || null, item.package_count || null, item.unit_net_weight || null,
              item.id
            ]
          );
        } else {
          await client.query(
            `INSERT INTO outsourcing_ticket_items 
             (ticket_id, order_id, product_id, order_quantity, processing_type, quantity_out, 
              gross_weight, pallet_weight, net_weight, notes, packing_specification, package_count, unit_net_weight)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              id, item.order_id, item.product_id, item.order_quantity || 0, item.processing_type || null, item.quantity_out || 0,
              item.gross_weight || null, item.pallet_weight || null, item.net_weight || null, item.notes || null,
              item.packing_specification || null, item.package_count || null, item.unit_net_weight || null
            ]
          );
        }
      }
    }

    if (!status) {
      const checkStatusRes = await client.query(
        `SELECT 
          (SELECT COALESCE(SUM(quantity_out), 0) FROM outsourcing_ticket_items WHERE ticket_id = $1) as total_out,
          (SELECT COALESCE(SUM(r.quantity_returned), 0) 
           FROM outsourcing_returns r 
           JOIN outsourcing_ticket_items i ON r.ticket_item_id = i.id 
           WHERE i.ticket_id = $1) as total_returned`,
        [id]
      );

      if (checkStatusRes.rowCount > 0) {
        const { total_out, total_returned } = checkStatusRes.rows[0];
        let newStatus = "PENDING";
        if (parseFloat(total_returned) >= parseFloat(total_out) && parseFloat(total_out) > 0) {
          newStatus = "COMPLETED";
        } else if (parseFloat(total_returned) > 0) {
          newStatus = "PARTIAL";
        }

        await client.query("UPDATE outsourcing_tickets SET status = $1 WHERE id = $2", [newStatus, id]);
      }
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES ($1, 'UPDATE', 'OutsourcingTicket', $2)`,
      [user_id, id]
    );

    await client.query("COMMIT");
    res.json({ message: "Cập nhật phiếu thành công" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update Outsourcing Ticket Error:", error);
    res.status(400).json({ message: error.message || "Lỗi khi cập nhật phiếu" });
  } finally {
    client.release();
  }
};