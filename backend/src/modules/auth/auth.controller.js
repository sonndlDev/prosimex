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

    const token = jwt.sign(
      { id: user.id, username: user.username, role_name: user.role_name, factory_id: user.factory_id },
      process.env.JWT_SECRET || 'secretKey',
      { expiresIn: '1d' }
    )

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role_name,
        factory_id: user.factory_id
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
