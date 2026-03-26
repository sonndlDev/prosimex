import pool from '../../config/db.js'

export const getProducts = async (req, res) => {
  try {
    const { factory_id, page = 1, limit = 10, search = "" } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = (pageInt - 1) * limitInt;

    let whereClause = "WHERE p.deleted_at IS NULL";
    const queryParams = [];

    if (factory_id) {
      queryParams.push(factory_id);
      whereClause += ` AND p.factory_id = $${queryParams.length}`;
    }

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (p.name ILIKE $${queryParams.length} OR pg.name ILIKE $${queryParams.length})`;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM products p 
      LEFT JOIN product_groups pg ON p.product_group_id = pg.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get data
    const dataQuery = `
      SELECT p.*, pg.name as product_group_name 
      FROM products p 
      LEFT JOIN product_groups pg ON p.product_group_id = pg.id
      ${whereClause}
      ORDER BY p.created_at DESC
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
    console.error("Get Products Error:", error);
    res.status(500).json({ message: "Error retrieving products", error });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, product_group_id, factory_id, is_active } = req.body
    const result = await pool.query(
      `INSERT INTO products (name, product_group_id, factory_id, is_active) 
             VALUES ($1, $2, $3, COALESCE($4, true)) RETURNING *`,
      [name, product_group_id, factory_id, is_active]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error })
  }
}

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params
    const { name, product_group_id, is_active } = req.body
    const result = await pool.query(
      `UPDATE products 
             SET name = COALESCE($1, name), 
                 product_group_id = COALESCE($2, product_group_id), 
                 is_active = COALESCE($3, is_active), 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4 AND deleted_at IS NULL RETURNING *`,
      [name, product_group_id, is_active, id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Product not found' })
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error })
  }
}

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL',
      [id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Product not found' })
    res.json({ message: 'Product deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error })
  }
}
