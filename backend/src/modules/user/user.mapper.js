/**
 * @file user.mapper.js
 * Transforms raw DAL rows into the API response shape for the user list.
 *
 * Original mapping (from getUsers):
 *   - Remove role_permissions from the row
 *   - Add effective_permissions = mergeEffectivePermissions(row.permissions, rolePerms)
 *
 * Note: the original uses `delete row.role_permissions` (mutation).
 * This mapper avoids mutation by destructuring.
 */

import { mergeEffectivePermissions } from '../../utils/permissions.util.js';

/**
 * Map a single raw DAL row to the public user shape.
 *
 * @param {object} row — raw row from usersDal.findList (includes role_permissions)
 * @returns {object}   — row without role_permissions, with effective_permissions added
 */
export function mapUser(row) {
  const { role_permissions, ...rest } = row;
  return {
    ...rest,
    effective_permissions: mergeEffectivePermissions(rest.permissions, role_permissions),
  };
}

/**
 * Map an array of raw DAL rows.
 *
 * @param {object[]} rows
 * @returns {object[]}
 */
export function mapUsers(rows) {
  return rows.map(mapUser);
}
