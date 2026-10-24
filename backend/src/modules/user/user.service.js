/**
 * @file user.service.js
 * Business logic for the user module — read path only.
 *
 * Read endpoints:
 *   getUsers  (Type A) — paginated list with search filter and role JOIN
 *   getRoles  (Type E) — full roles list, no pagination
 *
 * Mutations (createUser, updateUser, deleteUser, createRole,
 * deleteRole, updateRolePermissions, updateProfile) are preserved in
 * __legacy__/user.controller.legacy.js and re-exported from the slim controller.
 *
 * Query count per operation:
 *   getUsers: 2 (COUNT + list SELECT, run in parallel)
 *   getRoles: 1 (simple SELECT)
 */

import { usersDal } from '../../dal/users.dal.js';
import { buildWhere } from './user.filters.js';
import { mapUsers } from './user.mapper.js';

/**
 * Fetch a paginated, optionally filtered list of users.
 * Returns same shape as original getUsers: { data, total, page, limit }.
 *
 * @param {{ search?: string }} filters
 * @param {{ page?: number|string, limit?: number|string }} pagination
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
async function getUsers({ search = '' } = {}, { page = 1, limit = 10 } = {}) {
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const offsetInt = (pageInt - 1) * limitInt;

  const { where, params } = buildWhere({ search });

  const [total, rows] = await Promise.all([
    usersDal.count(where, params),
    usersDal.findList(where, limitInt, offsetInt, params),
  ]);

  return {
    data: mapUsers(rows),
    total,
    page: pageInt,
    limit: limitInt,
  };
}

/**
 * Fetch all roles ordered by name ASC.
 * Returns an array of role objects (same shape as original getRoles).
 *
 * @returns {Promise<object[]>}
 */
async function getRoles() {
  return usersDal.getRoles();
}

export const userService = {
  getUsers,
  getRoles,
};
