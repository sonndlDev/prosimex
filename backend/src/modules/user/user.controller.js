import bcrypt from 'bcrypt'
import pool from '../../config/db.js'

export const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.role_id, r.name as role_name, u.factory_id, u.is_active, u.created_at
             FROM users u
             JOIN roles r ON u.role_id = r.id
             WHERE u.deleted_at IS NULL`
    )
    res.json(result.rows)
  } catch (error) {
    console.error('getUsers error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const createUser = async (req, res) => {
  try {
    const { username, password, role_id, role_name, factory_id } = req.body

    let finalRoleId = role_id;
    if (!finalRoleId && role_name) {
      const roleRes = await pool.query('SELECT id FROM roles WHERE name = $1', [role_name]);
      if (roleRes.rows.length > 0) finalRoleId = roleRes.rows[0].id;
    }

    if (!finalRoleId) return res.status(400).json({ message: 'Valid role is required' });

    const salt = await bcrypt.genSalt(10)
    const password_hash = await bcrypt.hash(password, salt)

    const result = await pool.query(
      `INSERT INTO users (username, password_hash, role_id, factory_id)
             VALUES ($1, $2, $3, $4) RETURNING id, username, role_id, factory_id, is_active`,
      [username, password_hash, finalRoleId, factory_id || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('createUser error:', error)
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Username already exists' })
    }
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params
    const { role_id, role_name, factory_id, is_active, password } = req.body

    let finalRoleId = role_id;
    if (!finalRoleId && role_name) {
      const roleRes = await pool.query('SELECT id FROM roles WHERE name = $1', [role_name]);
      if (roleRes.rows.length > 0) finalRoleId = roleRes.rows[0].id;
    }

    let password_hash = null;
    if (password) {
        const salt = await bcrypt.genSalt(10)
        password_hash = await bcrypt.hash(password, salt)
    }

    const result = await pool.query(
      `UPDATE users 
             SET role_id = COALESCE($1, role_id),
                 factory_id = COALESCE($2, factory_id),
                 is_active = COALESCE($3, is_active),
                 password_hash = COALESCE($4, password_hash),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 AND deleted_at IS NULL
             RETURNING id, username, role_id, factory_id, is_active`,
      [finalRoleId, factory_id, is_active, password_hash, id]
    )

    if (result.rowCount === 0) return res.status(404).json({ message: 'User not found' })

    res.json(result.rows[0])
  } catch (error) {
    console.error('updateUser error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL',
      [id]
    )

    if (result.rowCount === 0) return res.status(404).json({ message: 'User not found' })

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('deleteUser error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
