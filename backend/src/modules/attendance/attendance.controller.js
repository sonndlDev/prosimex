import pool from '../../config/db.js'

export const checkIn = async (req, res) => {
  try {
    const userId = req.user.id
    const { note } = req.body

    // Check if already checked in today
    const existing = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE',
      [userId]
    )

    if (existing.rowCount > 0) {
      return res.status(400).json({ message: 'Bạn đã chấm công hôm nay rồi.' })
    }

    const result = await pool.query(
      'INSERT INTO attendance (user_id, note) VALUES ($1, $2) RETURNING *',
      [userId, note]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi chấm công vào', error: error.message })
  }
}

export const checkOut = async (req, res) => {
  try {
    const userId = req.user.id

    const result = await pool.query(
      `UPDATE attendance 
       SET check_out_time = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND date = CURRENT_DATE AND check_out_time IS NULL
       RETURNING *`,
      [userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi chấm công vào hôm nay hoặc bạn đã chấm công ra rồi.' })
    }

    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi chấm công ra', error: error.message })
  }
}

export const getTodayStatus = async (req, res) => {
  try {
    const userId = req.user.id
    const result = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE',
      [userId]
    )
    res.json(result.rows[0] || null)
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy trạng thái chấm công', error: error.message })
  }
}

export const getAttendanceLogs = async (req, res) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role_name
    const { targetUserId, startDate, endDate } = req.query

    let query = `
      SELECT a.*, u.username 
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `
    const params = []

    // If not Admin, forced to see own logs
    if (userRole !== 'ADMIN') {
      params.push(userId)
      query += ` AND a.user_id = $${params.length}`
    } else if (targetUserId) {
      // If Admin and specific user requested
      params.push(targetUserId)
      query += ` AND a.user_id = $${params.length}`
    }

    if (startDate) {
      params.push(startDate)
      query += ` AND a.date >= $${params.length}`
    }

    if (endDate) {
      params.push(endDate)
      query += ` AND a.date <= $${params.length}`
    }

    query += ' ORDER BY a.date DESC, a.check_in_time DESC LIMIT 100'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy lịch sử chấm công', error: error.message })
  }
}
