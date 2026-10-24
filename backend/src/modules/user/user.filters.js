/**
 * @file user.filters.js
 * Builds the WHERE clause for user count/list queries.
 *
 * Original logic (from getUsers):
 *   WHERE u.deleted_at IS NULL
 *   [ AND (u.username ILIKE $n OR u.full_name ILIKE $n) ]  — search filter
 *
 * Returns { where, params } for use in count and list queries.
 */

/**
 * Build WHERE clause and params for users list/count queries.
 *
 * @param {{ search?: string }} filters
 * @returns {{ where: string, params: unknown[] }}
 */
export function buildWhere({ search = '' } = {}) {
  let where = 'WHERE u.deleted_at IS NULL';
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (u.username ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`;
  }

  return { where, params };
}
