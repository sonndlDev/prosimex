import pool from '../../config/db.js';

export const getInventory = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", inventory_type = "ALL" } = req.query;
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


    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM product_inventory pi
      JOIN products p ON pi.product_id = p.id
      JOIN operations o ON pi.operation_id = o.id
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
      JOIN products p ON pi.product_id = p.id
      JOIN operations o ON pi.operation_id = o.id
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
