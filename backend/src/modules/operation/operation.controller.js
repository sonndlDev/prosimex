import pool from '../../config/db.js'

export const getOperations = async (req, res) => {
  try {
    const query = `
      SELECT 
        o.*,
        COALESCE(
          json_agg(DISTINCT pg.name) FILTER (WHERE pg.name IS NOT NULL),
          '[]'
        ) as product_groups
      FROM operations o
      LEFT JOIN product_group_operations pgo ON o.id = pgo.operation_id AND pgo.deleted_at IS NULL
      LEFT JOIN product_groups pg ON pgo.product_group_id = pg.id AND pg.deleted_at IS NULL
      WHERE o.deleted_at IS NULL
      GROUP BY o.id
    `
    const result = await pool.query(query)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving operations', error })
  }
}

export const createOperation = async (req, res) => {
  try {
    const { name, description } = req.body
    const result = await pool.query(
      'INSERT INTO operations (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Error creating operation', error })
  }
}

export const updateOperation = async (req, res) => {
  try {
    const { id } = req.params
    const { name, description } = req.body
    const result = await pool.query(
      'UPDATE operations SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND deleted_at IS NULL RETURNING *',
      [name, description, id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Operation not found' })
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Error updating operation', error })
  }
}

export const deleteOperation = async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'UPDATE operations SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL',
      [id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Operation not found' })
    res.json({ message: 'Operation deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting operation', error })
  }
}
