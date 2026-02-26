import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import pool from '../../config/db.js'

export const login = async (req, res) => {
  try {
    const { username, password } = req.body

    const result = await pool.query(
      `SELECT u.*, r.name as role_name 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.username = $1 AND u.is_active = true AND u.deleted_at IS NULL`,
      [username]
    )

    const user = result.rows[0]

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const accessToken = jwt.sign(
      { id: user.id, username: user.username, role_name: user.role_name, factory_id: user.factory_id, permissions: user.permissions },
      process.env.JWT_SECRET || 'secretKey',
      { expiresIn: '15m' }
    )

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || 'refreshSecretKey',
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful',
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role_name,
        factory_id: user.factory_id,
        permissions: user.permissions,
        full_name: user.full_name,
        phone: user.phone,
        email: user.email
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, r.name as role_name, u.factory_id, u.permissions, u.is_active, u.full_name, u.phone, u.email
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [req.user.id]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    const user = result.rows[0]
    res.json({
      id: user.id,
      username: user.username,
      role: user.role_name,
      factory_id: user.factory_id,
      permissions: user.permissions,
      is_active: user.is_active,
      full_name: user.full_name,
      phone: user.phone,
      email: user.email
    })
    } catch (error) {
    console.error('getMe error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token is required' })
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refreshSecretKey', async (err, decoded) => {
      if (err) {
        return res.status(401).json({ message: 'Invalid refresh token' })
      }

      // Fetch user to get latest permissions/role
      const result = await pool.query(
        `SELECT u.*, r.name as role_name 
         FROM users u 
         JOIN roles r ON u.role_id = r.id 
         WHERE u.id = $1 AND u.is_active = true AND u.deleted_at IS NULL`,
        [decoded.id]
      )

      const user = result.rows[0]
      if (!user) {
        return res.status(401).json({ message: 'User not found or inactive' })
      }

      const newAccessToken = jwt.sign(
        { id: user.id, username: user.username, role_name: user.role_name, factory_id: user.factory_id, permissions: user.permissions },
        process.env.JWT_SECRET || 'secretKey',
        { expiresIn: '15m' }
      )

      res.json({ token: newAccessToken })
    })
  } catch (error) {
    console.error('RefreshToken error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
