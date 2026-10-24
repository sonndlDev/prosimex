/**
 * @file attendance.dal.js
 * Data Access Layer for the `attendance` table.
 *
 * Methods:
 *   count(where, params)            — count rows for getAttendanceLogs pagination
 *   findList(where, limit, offset, params) — paginated log rows with username
 *   findTodayByUserId(userId)       — single row for getTodayStatus
 *
 * Notes:
 *   - count and findList both use alias "a" for attendance, "u" for users,
 *     matching the original JOIN in getAttendanceLogs.
 *   - findTodayByUserId keeps the inline ICT date expression from the original.
 */

import { db } from '../shared/db/index.js';

const COUNT_QUERY = `SELECT COUNT(*) FROM attendance a JOIN users u ON a.user_id = u.id`;
const LIST_SELECT = `SELECT a.*, u.username FROM attendance a JOIN users u ON a.user_id = u.id`;
const ORDER_BY = `ORDER BY a.date DESC, a.check_in_time DESC`;

/**
 * Count attendance log rows matching the given WHERE clause.
 *
 * @param {string} where  - SQL WHERE string (e.g. "WHERE 1=1 AND a.user_id = $1")
 * @param {unknown[]} params - bound parameter values
 * @returns {Promise<number>}
 */
async function count(where, params) {
  const result = await db.query(`${COUNT_QUERY} ${where}`, params);
  return parseInt(result.rows[0].count);
}

/**
 * Fetch paginated attendance log rows.
 *
 * @param {string} where        - SQL WHERE string
 * @param {number} limit
 * @param {number} offset
 * @param {unknown[]} params    - bound parameter values (WITHOUT limit/offset)
 * @returns {Promise<object[]>}
 */
async function findList(where, limit, offset, params) {
  const query = `
    ${LIST_SELECT}
    ${where}
    ${ORDER_BY}
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const result = await db.query(query, [...params, limit, offset]);
  return result.rows;
}

/**
 * Fetch the attendance record for a user on today's ICT date.
 * Returns undefined if no record found (caller returns null to client).
 *
 * @param {number|string} userId
 * @returns {Promise<object|undefined>}
 */
async function findTodayByUserId(userId) {
  const result = await db.query(
    "SELECT * FROM attendance WHERE user_id = $1 AND date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date",
    [userId]
  );
  return result.rows[0];
}

export const attendanceDal = {
  count,
  findList,
  findTodayByUserId,
};
