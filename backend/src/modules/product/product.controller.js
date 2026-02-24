import pool from '../../config/db.js'

export const getProducts = async (req, res) => {
  try {
    const { factory_id } = req.query
    let query = `
            SELECT p.*, pg.name as product_group_name 
            FROM products p 
            LEFT JOIN product_groups pg ON p.product_group_id = pg.id
            WHERE p.deleted_at IS NULL
        `
    const params = []
    if (factory_id) {
      query += ' AND p.factory_id = $1'
      params.push(factory_id)
    }
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving products', error })
  }
}

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
