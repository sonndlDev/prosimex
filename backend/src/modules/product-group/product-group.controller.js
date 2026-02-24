import pool from '../../config/db.js'

export const getProductGroups = async (req, res) => {
  try {
    const { factory_id } = req.query
    let query = 'SELECT * FROM product_groups WHERE deleted_at IS NULL'
    const params = []
    if (factory_id) {
      query += ' AND factory_id = $1'
      params.push(factory_id)
    }
    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving product groups', error })
  }
}

export const createProductGroup = async (req, res) => {
  try {
    const { name, factory_id } = req.body
    const result = await pool.query(
      'INSERT INTO product_groups (name, factory_id) VALUES ($1, $2) RETURNING *',
      [name, factory_id]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Error creating product group', error })
  }
}

export const updateProductGroup = async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body
    const result = await pool.query(
      'UPDATE product_groups SET name = COALESCE($1, name), updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND deleted_at IS NULL RETURNING *',
      [name, id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Product group not found' })
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Error updating product group', error })
  }
}

export const deleteProductGroup = async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'UPDATE product_groups SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL',
      [id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Product group not found' })
    res.json({ message: 'Product group deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product group', error })
  }
}

// ========================================
// PRODUCT GROUP OPERATIONS (NESTED)
// ========================================

export const getProductGroupOperations = async (req, res) => {
  try {
    const { id } = req.params // product_group_id
    const result = await pool.query(
      `SELECT pgo.*, o.name as operation_name, m.name as machine_name 
             FROM product_group_operations pgo
             JOIN operations o ON pgo.operation_id = o.id
             JOIN machines m ON pgo.machine_id = m.id
             WHERE pgo.product_group_id = $1 AND pgo.deleted_at IS NULL
             ORDER BY pgo.sequence_order ASC`,
      [id]
    )
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving operations for group', error })
  }
}

export const createProductGroupOperation = async (req, res) => {
  try {
    const { id } = req.params // product_group_id
    const { operation_id, machine_id, sequence_order, dinh_muc, estimated_hours } = req.body
    const result = await pool.query(
      `INSERT INTO product_group_operations 
             (product_group_id, operation_id, machine_id, sequence_order, dinh_muc, estimated_hours) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, operation_id, machine_id, sequence_order, dinh_muc, estimated_hours]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Sequence order must be unique per product group' })
    }
    res.status(500).json({ message: 'Error mapping operation to group', error })
  }
}

export const deleteProductGroupOperation = async (req, res) => {
  try {
    const { id, operationId } = req.params // product_group_id, product_group_operation_id
    const result = await pool.query(
      'UPDATE product_group_operations SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND product_group_id = $2 AND deleted_at IS NULL',
      [operationId, id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Mapping not found' })
    res.json({ message: 'Operation mapping deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting mapping', error })
  }
}
