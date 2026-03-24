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
             LEFT JOIN operations o ON pgo.operation_id = o.id
             LEFT JOIN machines m ON pgo.machine_id = m.id
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
    const { operation_id, machine_id, sequence_order, dinh_muc } = req.body

    // 1. Check for duplicate operation_id in the same group
    const duplicateCheck = await pool.query(
      'SELECT id FROM product_group_operations WHERE product_group_id = $1 AND operation_id = $2 AND deleted_at IS NULL',
      [id, operation_id]
    )
    if (duplicateCheck.rowCount > 0) {
      return res.status(400).json({ message: 'Công đoạn này đã tồn tại trong quy trình của nhóm này.' })
    }

    // 2. Check for duplicate operation NAME in the same group (in case of multiple IDs with same name)
    const nameCheck = await pool.query(
      `SELECT pgo.id FROM product_group_operations pgo
       JOIN operations o ON pgo.operation_id = o.id
       WHERE pgo.product_group_id = $1 
       AND o.name = (SELECT name FROM operations WHERE id = $2)
       AND pgo.deleted_at IS NULL`,
      [id, operation_id]
    )
    if (nameCheck.rowCount > 0) {
      return res.status(400).json({ message: 'Công đoạn có tên này đã tồn tại trong quy trình. Vui lòng không thêm trùng tên.' })
    }

    const result = await pool.query(
      `INSERT INTO product_group_operations 
             (product_group_id, operation_id, machine_id, sequence_order, dinh_muc) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, operation_id, machine_id || null, sequence_order, dinh_muc || null]
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

export const updateProductGroupOperation = async (req, res) => {
  try {
    const { id, operationId } = req.params
    const { operation_id, machine_id, sequence_order, dinh_muc } = req.body

    // If changing operation_id, check for duplicate ID and NAME
    if (operation_id) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM product_group_operations WHERE product_group_id = $1 AND operation_id = $2 AND id != $3 AND deleted_at IS NULL',
        [id, operation_id, operationId]
      )
      if (duplicateCheck.rowCount > 0) {
        return res.status(400).json({ message: 'Công đoạn này đã tồn tại trong quy trình của nhóm này.' })
      }

      const nameCheck = await pool.query(
        `SELECT pgo.id FROM product_group_operations pgo
         JOIN operations o ON pgo.operation_id = o.id
         WHERE pgo.product_group_id = $1 
         AND o.name = (SELECT name FROM operations WHERE id = $2)
         AND pgo.id != $3
         AND pgo.deleted_at IS NULL`,
        [id, operation_id, operationId]
      )
      if (nameCheck.rowCount > 0) {
        return res.status(400).json({ message: 'Công đoạn có tên này đã tồn tại trong quy trình. Vui lòng không thêm trùng tên.' })
      }
    }

    const result = await pool.query(
      `UPDATE product_group_operations 
       SET operation_id = COALESCE($1, operation_id),
           machine_id = $2,
           sequence_order = COALESCE($3, sequence_order),
           dinh_muc = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND product_group_id = $6 AND deleted_at IS NULL
       RETURNING *`,
      [operation_id, machine_id || null, sequence_order, dinh_muc || null, operationId, id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Mapping not found' })
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Error updating mapping', error })
  }
}

export const reorderProductGroupOperations = async (req, res) => {
  const client = await pool.connect()
  try {
    const { id } = req.params // product_group_id
    const { orders } = req.body // Array of { id, sequence_order }
    
    await client.query('BEGIN')
    
    // To handle the unique constraint, first set them all to negative or high values if they conflict
    // Or just update them in one go in the transaction if possible.
    // A robust way is to set them to sequence_order + 1000 first, then set to real values.
    
    for (const item of orders) {
      await client.query(
        'UPDATE product_group_operations SET sequence_order = $1 WHERE id = $2 AND product_group_id = $3',
        [item.sequence_order + 1000, item.id, id]
      )
    }
    
    for (const item of orders) {
      await client.query(
        'UPDATE product_group_operations SET sequence_order = $1 WHERE id = $2 AND product_group_id = $3',
        [item.sequence_order, item.id, id]
      )
    }
    
    await client.query('COMMIT')
    res.json({ message: 'Reordered successfully' })
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(500).json({ message: 'Error reordering operations', error: error.message })
  } finally {
    client.release()
  }
}
