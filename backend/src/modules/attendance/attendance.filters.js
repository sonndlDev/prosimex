/**
 * @file attendance.filters.js
 * Builds the WHERE clause for attendance log count/list queries.
 *
 * Original logic (from getAttendanceLogs):
 *   WHERE 1=1
 *   [ AND a.user_id = $n ]   — forced for non-ADMIN, or when targetUserId != 'ALL_USERS'
 *   [ AND a.date >= $n ]     — startDate filter
 *   [ AND a.date <= $n ]     — endDate filter
 *
 * The caller passes userId + userRole to determine whether to scope by user.
 */

/**
 * Build a WHERE clause string and params array for attendance logs.
 * Returns { where: string, params: unknown[] }.
 *
 * @param {{
 *   userId: number|string,
 *   userRole: string,
 *   targetUserId?: string,
 *   startDate?: string,
 *   endDate?: string
 * }} filters
 * @returns {{ where: string, params: unknown[] }}
 */
export function buildWhere({ userId, userRole, targetUserId, startDate, endDate }) {
  let where = ' WHERE 1=1';
  const params = [];

  // If not Admin, forced to see own logs
  if (userRole !== 'ADMIN') {
    params.push(userId);
    where += ` AND a.user_id = $${params.length}`;
  } else if (targetUserId && targetUserId !== 'ALL_USERS') {
    // If Admin and specific user requested
    params.push(targetUserId);
    where += ` AND a.user_id = $${params.length}`;
  }

  if (startDate) {
    params.push(startDate);
    where += ` AND a.date >= $${params.length}`;
  }

  if (endDate) {
    params.push(endDate);
    where += ` AND a.date <= $${params.length}`;
  }

  return { where, params };
}
