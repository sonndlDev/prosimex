import pool from '../../config/db.js';

export const getInventory = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", inventory_type = "ALL", completed = "ALL" } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = (pageInt - 1) * limitInt;

    let whereClause = "WHERE pi.deleted_at IS NULL";
    const queryParams = [];

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (p.name ILIKE $${queryParams.length} OR o.name ILIKE $${queryParams.length})`;
    }

    if (inventory_type && inventory_type !== "ALL") {
      queryParams.push(inventory_type);
      whereClause += ` AND pi.inventory_type = $${queryParams.length}`;
    }

    if (completed === "true" || completed === "1") {
      whereClause += ` AND pi.completed_at IS NOT NULL`;
    } else if (completed === "false" || completed === "0") {
      whereClause += ` AND pi.completed_at IS NULL`;
    }


    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM product_inventory pi
      JOIN products p ON pi.product_id = p.id AND p.deleted_at IS NULL
      JOIN operations o ON pi.operation_id = o.id AND o.deleted_at IS NULL
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get data
    const dataQuery = `
      SELECT 
        pi.*, 
        p.name as product_name, 
        o.name as operation_name,
        COALESCE(u.full_name, u.username) as recorder_name
      FROM product_inventory pi
      JOIN products p ON pi.product_id = p.id AND p.deleted_at IS NULL
      JOIN operations o ON pi.operation_id = o.id AND o.deleted_at IS NULL
      LEFT JOIN users u ON pi.recorded_by = u.id
      ${whereClause}
      ORDER BY pi.recorded_at DESC
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
    console.error("Get Product Inventory Error:", error);
    res.status(500).json({ message: "Error retrieving product inventory", error: error.message });
  }
};

export const saveInventory = async (req, res) => {
  const client = await pool.connect();
  try {
    const { product_id, items } = req.body; // items: [{ operation_id, quantity, note, inventory_type }]
    const userId = req.user.id;

    if (!product_id || !items || !Array.isArray(items)) {
      return res.status(400).json({ message: "Invalid payload: product_id and items array are required" });
    }

    await client.query("BEGIN");

    const savedRecords = [];
    for (const item of items) {
      const { operation_id, quantity, note, inventory_type } = item;
      const result = await client.query(
        `INSERT INTO product_inventory (product_id, operation_id, quantity, note, recorded_by, inventory_type) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [product_id, operation_id, quantity, note, userId, inventory_type || 'BTP']
      );
      savedRecords.push(result.rows[0]);
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) 
       VALUES ($1, 'BULK_CREATE', 'ProductInventory', $2, $3)`,
      [userId, product_id, JSON.stringify(savedRecords)]
    );

    await client.query("COMMIT");
    res.status(201).json({ message: "Inventory recorded successfully", data: savedRecords });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Save Inventory Error:", error);
    res.status(500).json({ message: "Error saving inventory", error: error.message });
  } finally {
    client.release();
  }
};

export const updateInventory = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { quantity, note, inventory_type } = req.body;
    const userId = req.user.id;

    if (!id) {
      return res.status(400).json({ message: "Inventory ID is required" });
    }

    // Get current data for audit log
    const currentResult = await client.query(
      `SELECT * FROM product_inventory WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ message: "Inventory record not found" });
    }

    const currentData = currentResult.rows[0];

    await client.query("BEGIN");

    // Update the record
    const updateQuery = `
      UPDATE product_inventory 
      SET quantity = COALESCE($1, quantity),
          note = COALESCE($2, note),
          inventory_type = COALESCE($3, inventory_type)
      WHERE id = $4
      RETURNING *
    `;

    const result = await client.query(updateQuery, [quantity, note, inventory_type, id]);
    const updatedData = result.rows[0];

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data) 
       VALUES ($1, 'UPDATE', 'ProductInventory', $2, $3, $4)`,
      [userId, id, JSON.stringify(currentData), JSON.stringify(updatedData)]
    );

    await client.query("COMMIT");
    res.json({ message: "Inventory updated successfully", data: updatedData });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update Inventory Error:", error);
    res.status(500).json({ message: "Error updating inventory", error: error.message });
  } finally {
    client.release();
  }
};

export const completeInventory = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id) {
      return res.status(400).json({ message: "Inventory ID is required" });
    }

    const currentResult = await client.query(
      `SELECT * FROM product_inventory WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ message: "Inventory record not found" });
    }

    const currentData = currentResult.rows[0];

    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE product_inventory 
       SET completed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data) 
       VALUES ($1, 'COMPLETE', 'ProductInventory', $2, $3, $4)`,
      [userId, id, JSON.stringify(currentData), JSON.stringify({ completed_at: new Date().toISOString() })]
    );

    await client.query("COMMIT");
    res.json({ message: "Inventory completed successfully", data: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Complete Inventory Error:", error);
    res.status(500).json({ message: "Error completing inventory", error: error.message });
  } finally {
    client.release();
  }
};

export const deleteInventory = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id) {
      return res.status(400).json({ message: "Inventory ID is required" });
    }

    // Get current data for audit log
    const currentResult = await client.query(
      `SELECT * FROM product_inventory WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ message: "Inventory record not found" });
    }

    const currentData = currentResult.rows[0];

    await client.query("BEGIN");

    // Soft delete - set deleted_at timestamp
    const result = await client.query(
      `UPDATE product_inventory 
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data) 
       VALUES ($1, 'DELETE', 'ProductInventory', $2, $3, $4)`,
      [userId, id, JSON.stringify(currentData), JSON.stringify({ deleted_at: new Date().toISOString() })]
    );

    await client.query("COMMIT");
    res.json({ message: "Inventory deleted successfully", data: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete Inventory Error:", error);
    res.status(500).json({ message: "Error deleting inventory", error: error.message });
  } finally {
    client.release();
  }
};
