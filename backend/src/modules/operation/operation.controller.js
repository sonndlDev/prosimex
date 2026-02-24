import pool from '../../config/db.js'

export const getOperations = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM operations WHERE deleted_at IS NULL')
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
