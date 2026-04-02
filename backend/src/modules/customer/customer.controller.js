import pool from '../../config/db.js'

export const getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = (pageInt - 1) * limitInt;

    let whereClause = "WHERE deleted_at IS NULL";
    const queryParams = [];
    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (name ILIKE $${queryParams.length} OR code ILIKE $${queryParams.length})`;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM customers ${whereClause}`, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT c.*, c.address as contact_info, COALESCE(cu.full_name, cu.username) as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name
       FROM customers c
       LEFT JOIN users cu ON c.created_by = cu.id
       LEFT JOIN users mu ON c.modified_by = mu.id
       ${whereClause.replace(/deleted_at/g, 'c.deleted_at').replace(/name/g, 'c.name').replace(/code/g, 'c.code')}
       ORDER BY created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limitInt, offsetInt]
    );
    
    res.json({ data: result.rows, total, page: pageInt, limit: limitInt });
  } catch (error) {
    console.error("Get Customers Error:", error);
    res.status(500).json({ message: "Error retrieving customers", error });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { code, name, address, phone, is_active, contact_info } = req.body;
    const finalAddress = contact_info || address;
    const userId = req.user?.id;

    const result = await pool.query(
      `INSERT INTO customers (code, name, address, phone, is_active, created_by, modified_by) 
       VALUES ($1, $2, $3, $4, COALESCE($5, true), $6, $6) RETURNING *`,
      [code, name, finalAddress, phone, is_active, userId]
    );
    const newCustomer = result.rows[0];

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'CREATE', 'Customer', $2, $3)`,
      [userId, newCustomer.id, newCustomer]
    );

    res.status(201).json(newCustomer);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'Customer code already exists' });
    res.status(500).json({ message: 'Error creating customer', error });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, address, phone, is_active, contact_info } = req.body;
    const finalAddress = contact_info || address;
    const userId = req.user?.id;

    const beforeRes = await pool.query('SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (beforeRes.rowCount === 0) return res.status(404).json({ message: 'Customer not found' });

    const result = await pool.query(
      `UPDATE customers 
       SET code = COALESCE($1, code), name = COALESCE($2, name), address = COALESCE($3, address), 
           phone = COALESCE($4, phone), is_active = COALESCE($5, is_active), 
           updated_at = CURRENT_TIMESTAMP, modified_by = $7, modified_time = CURRENT_TIMESTAMP
       WHERE id = $6 AND deleted_at IS NULL RETURNING *`,
      [code, name, finalAddress, phone, is_active, id, userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Customer not found' });

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data) VALUES ($1, 'UPDATE', 'Customer', $2, $3, $4)`,
      [userId, id, beforeRes.rows[0], result.rows[0]]
    );

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(400).json({ message: 'Customer code already exists' });
    res.status(500).json({ message: 'Error updating customer', error });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const beforeRes = await pool.query('SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (beforeRes.rowCount === 0) return res.status(404).json({ message: 'Customer not found' });

    await pool.query(
      'UPDATE customers SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1',
      [id, userId]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data) VALUES ($1, 'DELETE', 'Customer', $2, $3)`,
      [userId, id, beforeRes.rows[0]]
    );

    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting customer', error });
  }
};
