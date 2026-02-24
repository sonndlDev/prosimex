import pool from '../../config/db.js'

export const getMachines = async (req, res) => {
  try {
    const { factory_id } = req.query
    let query = `
      SELECT m.*, f.name as factory_name 
      FROM machines m 
      LEFT JOIN factories f ON m.factory_id = f.id 
      WHERE m.deleted_at IS NULL
    `
    const params = []

    if (factory_id) {
      query += ' AND m.factory_id = $1'
      params.push(factory_id)
    }

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving machines', error })
  }
}

export const createMachine = async (req, res) => {
  try {
    const { code, name, factory_id, capacity_per_day, is_active } = req.body
    const result = await pool.query(
      `INSERT INTO machines (code, name, factory_id, capacity_per_day, is_active) 
             VALUES ($1, $2, $3, $4, COALESCE($5, true)) RETURNING *`,
      [code, name, factory_id, capacity_per_day, is_active]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Machine code must be unique per factory' })
    }
    res.status(500).json({ message: 'Error creating machine', error })
  }
}

export const updateMachine = async (req, res) => {
  try {
    const { id } = req.params
    const { name, capacity_per_day, is_active } = req.body
    const result = await pool.query(
      `UPDATE machines 
             SET name = COALESCE($1, name), 
                 capacity_per_day = COALESCE($2, capacity_per_day), 
                 is_active = COALESCE($3, is_active), 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $4 AND deleted_at IS NULL RETURNING *`,
      [name, capacity_per_day, is_active, id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Machine not found' })
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Error updating machine', error })
  }
}

export const deleteMachine = async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'UPDATE machines SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL',
      [id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Machine not found' })
    res.json({ message: 'Machine deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting machine', error })
  }
}
