import pool from '../../config/db.js'

export const getFactories = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM factories WHERE deleted_at IS NULL')
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving factories', error })
  }
}

export const createFactory = async (req, res) => {
  try {
    const { name, location, is_active } = req.body
    const result = await pool.query(
      'INSERT INTO factories (name, location, is_active) VALUES ($1, $2, $3) RETURNING *',
      [name, location || null, is_active !== undefined ? is_active : true]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Error creating factory', error })
  }
}

export const updateFactory = async (req, res) => {
  try {
    const { id } = req.params
    const { name, location, is_active } = req.body
    const result = await pool.query(
      'UPDATE factories SET name = COALESCE($1, name), location = COALESCE($2, location), is_active = COALESCE($3, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = $4 AND deleted_at IS NULL RETURNING *',
      [name || null, location || null, is_active !== undefined ? is_active : null, id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Factory not found' })
    res.json(result.rows[0])
  } catch (error) {
    console.error('Update factory error:', error)
    res.status(500).json({ message: 'Error updating factory', error })
  }
}

export const deleteFactory = async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'UPDATE factories SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL',
      [id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Factory not found' })
    res.json({ message: 'Factory deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting factory', error })
  }
}
