import bcrypt from 'bcrypt'
import pool from '../../config/db.js'

export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = (pageInt - 1) * limitInt;

    let whereClause = "WHERE u.deleted_at IS NULL";
    const queryParams = [];

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (u.username ILIKE $${queryParams.length} OR u.full_name ILIKE $${queryParams.length})`;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get data
    const dataQuery = `
      SELECT u.id, u.username, u.full_name, u.phone, u.email, u.role_id, r.name as role_name, u.factory_id, u.is_active, u.created_at, u.permissions
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ORDER BY u.created_at DESC
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
    console.error("Get Users Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createRole = async (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ message: 'Role name is required' })

    const result = await pool.query(
      'INSERT INTO roles (name) VALUES ($1) RETURNING *',
      [name.toUpperCase()]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('createRole error:', error)
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Role already exists' })
    }
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const deleteRole = async (req, res) => {
  const client = await pool.connect()
  try {
    const { id } = req.params
    await client.query('BEGIN')

    // 1. Check if role is system-protected
    const roleCheck = await client.query('SELECT name, is_system FROM roles WHERE id = $1', [id])
    if (roleCheck.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Role not found' })
    }

    if (roleCheck.rows[0].is_system) {
      await client.query('ROLLBACK')
      return res.status(400).json({ message: 'Cannot delete system roles' })
    }

    // 2. Find DEFAULT_USER role id
    const defaultRoleRes = await client.query("SELECT id FROM roles WHERE name = 'DEFAULT_USER'")
    if (defaultRoleRes.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(500).json({ message: 'Default fallback role not found in system' })
    }
    const defaultRoleId = defaultRoleRes.rows[0].id

    // 3. Reassign users to DEFAULT_USER
    await client.query('UPDATE users SET role_id = $1 WHERE role_id = $2', [defaultRoleId, id])

    // 4. Delete the role
    await client.query('DELETE FROM roles WHERE id = $1', [id])

    await client.query('COMMIT')
    res.json({ message: 'Role deleted successfully and users reassigned to DEFAULT_USER' })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('deleteRole error:', error)
    res.status(500).json({ message: 'Internal server error' })
  } finally {
    client.release()
  }
}

export const getRoles = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM roles ORDER BY name ASC')
    res.json(result.rows)
  } catch (error) {
    console.error('getRoles error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const createUser = async (req, res) => {
  try {
    const { username, password, role_id, role_name, factory_id, full_name, phone, email } = req.body

    let finalRoleId = role_id || null;
    if (!finalRoleId && role_name) {
      const roleRes = await pool.query('SELECT id FROM roles WHERE name = $1', [role_name]);
      if (roleRes.rows.length > 0) finalRoleId = roleRes.rows[0].id;
    }

    if (!finalRoleId) return res.status(400).json({ message: 'Valid role is required' });

    const salt = await bcrypt.genSalt(10)
    const password_hash = await bcrypt.hash(password, salt)

    const result = await pool.query(
      `INSERT INTO users (username, password_hash, role_id, factory_id, permissions, full_name, phone, email)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, full_name, phone, email, role_id, factory_id, is_active, permissions`,
      [username, password_hash, finalRoleId, factory_id || null, JSON.stringify(req.body.permissions || []), full_name || null, phone || null, email || null]
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
    const { role_id, role_name, factory_id, is_active, password, full_name, phone, email } = req.body

    let finalRoleId = role_id || null;
    if (!finalRoleId && role_name) {
      const roleRes = await pool.query('SELECT id FROM roles WHERE name = $1', [role_name]);
      if (roleRes.rows.length > 0) finalRoleId = roleRes.rows[0].id;
    }

    let password_hash = null;
    if (password) {
        const salt = await bcrypt.genSalt(10)
        password_hash = await bcrypt.hash(password, salt)
    }

    // Convert empty strings to null for database compatibility
    const finalFactoryId = factory_id === '' ? null : factory_id;
    const finalIsActive = is_active === '' ? null : is_active;

    const result = await pool.query(
      `UPDATE users 
             SET role_id = COALESCE($1, role_id),
                 factory_id = COALESCE($2, factory_id),
                 is_active = COALESCE($3, is_active),
                 password_hash = COALESCE($4, password_hash),
                 permissions = COALESCE($5, permissions),
                 full_name = COALESCE($6, full_name),
                 phone = COALESCE($7, phone),
                 email = COALESCE($8, email),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $9 AND deleted_at IS NULL
             RETURNING id, username, full_name, phone, email, role_id, factory_id, is_active, permissions`,
      [finalRoleId, finalFactoryId, finalIsActive, password_hash, req.body.permissions ? JSON.stringify(req.body.permissions) : null, full_name, phone, email, id]
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
export const updateProfile = async (req, res) => {
  try {
    const id = req.user.id
    const { full_name, phone, email, password } = req.body

    let password_hash = null
    if (password) {
      const salt = await bcrypt.genSalt(10)
      password_hash = await bcrypt.hash(password, salt)
    }

    const result = await pool.query(
      `UPDATE users 
             SET full_name = COALESCE($1, full_name),
                 phone = COALESCE($2, phone),
                 email = COALESCE($3, email),
                 password_hash = COALESCE($4, password_hash),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5 AND deleted_at IS NULL
             RETURNING id, username, full_name, phone, email, role_id`,
      [full_name, phone, email, password_hash, id]
    )

    if (result.rowCount === 0) return res.status(404).json({ message: 'User not found' })

    res.json(result.rows[0])
  } catch (error) {
    console.error('updateProfile error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
