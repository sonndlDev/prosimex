import pool from '../../config/db.js'

export const checkIn = async (req, res) => {
  try {
    const userId = req.user.id
    const { note } = req.body

    // Check if already checked in today (ICT)
    const existing = await pool.query(
      "SELECT * FROM attendance WHERE user_id = $1 AND date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date",
      [userId]
    )

    if (existing.rowCount > 0) {
      return res.status(400).json({ message: 'Bạn đã chấm công hôm nay rồi.' })
    }

    const result = await pool.query(
      "INSERT INTO attendance (user_id, note, date) VALUES ($1, $2, (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) RETURNING *",
      [userId, note]
    )
    const record = result.rows[0]

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'CREATE', 'Attendance', $2, $3)`,
      [userId, record.id, record]
    )

    res.status(201).json(record)
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
       WHERE user_id = $1 AND date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AND check_out_time IS NULL
       RETURNING *`,
      [userId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Không tìm thấy bản ghi chấm công vào hôm nay hoặc bạn đã chấm công ra rồi.' })
    }

    const record = result.rows[0]

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'UPDATE', 'Attendance', $2, $3)`,
      [userId, record.id, record]
    )

    res.json(record)
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi chấm công ra', error: error.message })
  }
}

export const getTodayStatus = async (req, res) => {
  try {
    const userId = req.user.id
    const result = await pool.query(
      "SELECT * FROM attendance WHERE user_id = $1 AND date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date",
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
    const { targetUserId, startDate, endDate, page = 1, limit = 10 } = req.query
    const offset = (page - 1) * limit

    let whereClause = ' WHERE 1=1'
    const params = []

    // If not Admin, forced to see own logs
    if (userRole !== 'ADMIN') {
      params.push(userId)
      whereClause += ` AND a.user_id = $${params.length}`
    } else if (targetUserId && targetUserId !== 'ALL_USERS') {
      // If Admin and specific user requested
      params.push(targetUserId)
      whereClause += ` AND a.user_id = $${params.length}`
    }

    if (startDate) {
      params.push(startDate)
      whereClause += ` AND a.date >= $${params.length}`
    }

    if (endDate) {
      params.push(endDate)
      whereClause += ` AND a.date <= $${params.length}`
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM attendance a JOIN users u ON a.user_id = u.id ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].count)

    const query = `
      SELECT a.*, u.username 
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      ${whereClause}
      ORDER BY a.date DESC, a.check_in_time DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `

    const result = await pool.query(query, [...params, limit, offset])
    
    res.json({
      data: result.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    })
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy lịch sử chấm công', error: error.message })
  }
}
