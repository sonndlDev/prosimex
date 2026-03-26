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

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM customers ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get data
    const dataQuery = `
      SELECT *, address as contact_info 
      FROM customers 
      ${whereClause}
      ORDER BY created_at DESC
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
    console.error("Get Customers Error:", error);
    res.status(500).json({ message: "Error retrieving customers", error });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const { code, name, address, phone, is_active, contact_info } = req.body
    const finalAddress = contact_info || address;
    const result = await pool.query(
      `INSERT INTO customers (code, name, address, phone, is_active) 
             VALUES ($1, $2, $3, $4, COALESCE($5, true)) RETURNING *`,
      [code, name, finalAddress, phone, is_active]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Customer code already exists' })
    }
    res.status(500).json({ message: 'Error creating customer', error })
  }
}

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params
    const { code, name, address, phone, is_active, contact_info } = req.body
    
    // Support either contact_info (frontend) or address (direct API)
    const finalAddress = contact_info || address;

    const result = await pool.query(
      `UPDATE customers 
             SET code = COALESCE($1, code),
                 name = COALESCE($2, name), 
                 address = COALESCE($3, address), 
                 phone = COALESCE($4, phone), 
                 is_active = COALESCE($5, is_active), 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $6 AND deleted_at IS NULL RETURNING *`,
      [code, name, finalAddress, phone, is_active, id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Customer not found' })
    res.json(result.rows[0])
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Customer code already exists' })
    }
    res.status(500).json({ message: 'Error updating customer', error })
  }
}

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'UPDATE customers SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL',
      [id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Customer not found' })
    res.json({ message: 'Customer deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting customer', error })
  }
}
