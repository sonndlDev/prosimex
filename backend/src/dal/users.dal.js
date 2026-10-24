/**
 * @file users.dal.js
 * Data Access Layer for the `users` table.
 * One DAL per table — do not create a second DAL for users.
 *
 * Note: the users table has no deleted_at filter in the original customer
 * controller JOINs (LEFT JOIN users cu ON c.created_by = cu.id — no condition).
 * This DAL replicates that behaviour: no deleted_at filter on findByIds.
 *
 * Extended for user module refactor:
 *   count(where, params)      — total row count with JOIN roles
 *   findList(where, limit, offset, params) — paginated list with JOIN roles
 *   getRoles()                — full roles list ordered by name ASC
 */

import { db } from '../shared/db/index.js';

const SQL_FIND_BY_IDS = `
  SELECT id, username, full_name
  FROM users
  WHERE id = ANY($1::int[])
`;

const SQL_COUNT = `
  SELECT COUNT(*)
  FROM users u
  JOIN roles r ON u.role_id = r.id
`;

const SQL_FIND_LIST = `
  SELECT u.id, u.username, u.full_name, u.phone, u.email, u.role_id, r.name as role_name, u.factory_id, u.is_active, u.created_at, u.permissions, r.permissions as role_permissions
  FROM users u
  JOIN roles r ON u.role_id = r.id
`;

const SQL_GET_ROLES = `
  SELECT id, name, is_system, permissions, created_at FROM roles ORDER BY name ASC
`;

/**
 * Find users by an array of IDs.
 * No deleted_at filter — matches original LEFT JOIN behaviour.
 * @param {number[]} ids
 * @param {object} [client]
 * @returns {Promise<object[]>}
 */
async function findByIds(ids, client = db) {
  if (!ids.length) return [];
  const { rows } = await client.query(SQL_FIND_BY_IDS, [ids]);
  return rows;
}

/**
 * Count users matching the given WHERE clause.
 * Mirrors the original count query: FROM users u JOIN roles r ON u.role_id = r.id.
 *
 * @param {string} where  — e.g. "WHERE u.deleted_at IS NULL AND ..."
 * @param {unknown[]} params — positional params for WHERE placeholders
 * @param {object} [client]
 * @returns {Promise<number>}
 */
async function count(where, params, client = db) {
  const { rows } = await client.query(`${SQL_COUNT} ${where}`, params);
  return parseInt(rows[0].count, 10);
}

/**
 * Fetch a paginated page of users matching the given WHERE clause.
 * ORDER BY u.created_at DESC — matches original getUsers ordering.
 *
 * @param {string} where       — e.g. "WHERE u.deleted_at IS NULL AND ..."
 * @param {number} limit
 * @param {number} offset
 * @param {unknown[]} params   — positional params for WHERE placeholders
 * @param {object} [client]
 * @returns {Promise<object[]>}
 */
async function findList(where, limit, offset, params, client = db) {
  const sql = `
    ${SQL_FIND_LIST}
    ${where}
    ORDER BY u.created_at DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;
  const { rows } = await client.query(sql, [...params, limit, offset]);
  return rows;
}

/**
 * Fetch all roles ordered by name ASC.
 * Matches original getRoles query exactly.
 *
 * @param {object} [client]
 * @returns {Promise<object[]>}
 */
async function getRoles(client = db) {
  const { rows } = await client.query(SQL_GET_ROLES);
  return rows;
}

export const usersDal = {
  findByIds,
  count,
  findList,
  getRoles,
};
