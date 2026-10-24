/**
 * @file attendance.service.js
 * Business logic for the attendance module — read path only.
 * Mutations (checkIn, checkOut) are preserved in __legacy__/attendance.controller.legacy.js
 * and re-exported from the slim controller.
 *
 * Query count per operation:
 *   getAttendanceLogs: 2 (COUNT + list SELECT, run in parallel)
 *   getTodayStatus:    1 (single row SELECT)
 */

import { attendanceDal } from '../../dal/attendance.dal.js';
import { buildWhere } from './attendance.filters.js';

/**
 * Fetch paginated attendance logs.
 * Returns same shape as original getAttendanceLogs:
 *   { data, total, page, limit }
 *
 * @param {{
 *   userId: number|string,
 *   userRole: string,
 *   targetUserId?: string,
 *   startDate?: string,
 *   endDate?: string
 * }} filters
 * @param {{ page?: number|string, limit?: number|string }} pagination
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
async function getAttendanceLogs(filters, { page = 1, limit = 10 } = {}) {
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const offset = (pageInt - 1) * limitInt;

  const { where, params } = buildWhere(filters);

  const [total, rows] = await Promise.all([
    attendanceDal.count(where, params),
    attendanceDal.findList(where, limitInt, offset, params),
  ]);

  return {
    data: rows,
    total,
    page: pageInt,
    limit: limitInt,
  };
}

/**
 * Fetch the attendance record for a user on today's ICT date.
 * Returns null if no record exists (matches original `result.rows[0] || null`).
 *
 * @param {number|string} userId
 * @returns {Promise<object|null>}
 */
async function getTodayStatus(userId) {
  const row = await attendanceDal.findTodayByUserId(userId);
  return row || null;
}

export const attendanceService = {
  getAttendanceLogs,
  getTodayStatus,
};
