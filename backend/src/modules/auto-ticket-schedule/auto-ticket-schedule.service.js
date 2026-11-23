import pool from '../../config/db.js'

const RULE_TYPES = ['OFF_RUN', 'EXTRA_TARGET']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const httpError = (status, message) => Object.assign(new Error(message), { status })

const isValidDate = (value) => {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false
  const d = new Date(`${value}T00:00:00Z`)
  return !isNaN(d) && d.toISOString().slice(0, 10) === value
}

const RULE_COLUMNS = `
  id,
  rule_type,
  to_char(run_date, 'YYYY-MM-DD')        AS run_date,
  to_char(run_date_end, 'YYYY-MM-DD')    AS run_date_end,
  to_char(target_date, 'YYYY-MM-DD')     AS target_date,
  to_char(target_date_end, 'YYYY-MM-DD') AS target_date_end,
  ARRAY(SELECT to_char(d, 'YYYY-MM-DD') FROM unnest(target_dates) AS d ORDER BY d) AS target_dates,
  to_char(skip_run_date, 'YYYY-MM-DD')     AS skip_run_date,
  to_char(skip_run_date_end, 'YYYY-MM-DD') AS skip_run_date_end,
  note,
  status,
  job_status,
  last_run_at,
  created_by,
  created_at`

const RULE_STATUSES = ['ACTIVE', 'HIDE']
const MAX_RANGE_DAYS = 90

const dayDiff = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)

/** Chuẩn hóa khoảng ngày: end rỗng = một ngày. Trả về null nếu end không hợp lệ. */
const normalizeRange = (start, end, label) => {
  if (end === undefined || end === null || end === '') return null
  if (!isValidDate(end)) throw httpError(400, `${label}_end phải có dạng YYYY-MM-DD`)
  if (dayDiff(start, end) < 0) throw httpError(400, `${label}_end phải lớn hơn hoặc bằng ${label}`)
  if (dayDiff(start, end) + 1 > MAX_RANGE_DAYS) throw httpError(400, `Khoảng ngày tối đa ${MAX_RANGE_DAYS} ngày`)
  return end === start ? null : end
}

const MAX_TARGET_DATES = 60

/** Danh sách ngày tạo job: bất kỳ, không cần liền nhau. Không được trùng ngày chạy job. */
const normalizeTargetDates = (list, runStart, runEnd) => {
  if (!Array.isArray(list) || list.length === 0) throw httpError(400, 'Vui lòng chọn ít nhất một ngày tạo job')
  const unique = [...new Set(list)]
  if (unique.length > MAX_TARGET_DATES) throw httpError(400, `Tối đa ${MAX_TARGET_DATES} ngày tạo job`)
  for (const d of unique) {
    if (!isValidDate(d)) throw httpError(400, 'Ngày tạo job phải có dạng YYYY-MM-DD')
    if (d >= runStart && d <= runEnd) throw httpError(400, 'Ngày tạo job không được trùng ngày chạy job')
  }
  return unique.sort()
}

export async function listRules() {
  const { rows } = await pool.query(
    `SELECT ${RULE_COLUMNS}
       FROM auto_ticket_schedule_rules
      WHERE deleted_at IS NULL
      ORDER BY run_date, rule_type, target_date NULLS FIRST`
  )
  return rows
}

export async function createRule(body, userId) {
  const ruleType = body?.rule_type
  const runDate = body?.run_date
  const note = typeof body?.note === 'string' ? body.note.trim() || null : null

  if (!RULE_TYPES.includes(ruleType)) throw httpError(400, 'rule_type không hợp lệ')
  if (!isValidDate(runDate)) throw httpError(400, 'run_date phải có dạng YYYY-MM-DD')
  const runDateEnd = normalizeRange(runDate, body?.run_date_end, 'run_date')
  const runEnd = runDateEnd || runDate

  let targetDates = null
  if (ruleType === 'EXTRA_TARGET') {
    targetDates = normalizeTargetDates(body?.target_dates, runDate, runEnd)
  }

  // target_date giữ ngày đầu tiên để tương thích với index chống trùng
  const targetDate = targetDates ? targetDates[0] : null

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows } = await client.query(
      `INSERT INTO auto_ticket_schedule_rules
         (rule_type, run_date, run_date_end, target_date, target_dates, note, created_by)
       VALUES ($1, $2, $3, $4, $5::date[], $6, $7)
       RETURNING ${RULE_COLUMNS}`,
      [ruleType, runDate, runDateEnd, targetDate, targetDates, note, userId]
    )
    const created = rows[0]
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
       VALUES ($1, 'CREATE', 'AutoTicketScheduleRule', $2, $3)`,
      [userId, created.id, created]
    )
    await client.query('COMMIT')
    return created
  } catch (error) {
    await client.query('ROLLBACK')
    if (error.code === '23505') throw httpError(409, 'Quy tắc này đã tồn tại')
    throw error
  } finally {
    client.release()
  }
}

export async function updateRuleStatus(id, status, userId) {
  if (!RULE_STATUSES.includes(status)) throw httpError(400, 'status phải là ACTIVE hoặc HIDE')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const before = await client.query(
      `SELECT ${RULE_COLUMNS} FROM auto_ticket_schedule_rules WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id]
    )
    if (before.rowCount === 0) throw httpError(404, 'Không tìm thấy quy tắc')

    const { rows } = await client.query(
      `UPDATE auto_ticket_schedule_rules SET status = $2 WHERE id = $1 RETURNING ${RULE_COLUMNS}`,
      [id, status]
    )
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
       VALUES ($1, 'UPDATE', 'AutoTicketScheduleRule', $2, $3, $4)`,
      [userId, id, before.rows[0], rows[0]]
    )
    await client.query('COMMIT')
    return rows[0]
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function deleteRule(id, userId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const before = await client.query(
      `SELECT ${RULE_COLUMNS} FROM auto_ticket_schedule_rules WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
      [id]
    )
    if (before.rowCount === 0) throw httpError(404, 'Không tìm thấy quy tắc')

    await client.query(
      'UPDATE auto_ticket_schedule_rules SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    )
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data)
       VALUES ($1, 'DELETE', 'AutoTicketScheduleRule', $2, $3)`,
      [userId, id, before.rows[0]]
    )
    await client.query('COMMIT')
    return { success: true }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
