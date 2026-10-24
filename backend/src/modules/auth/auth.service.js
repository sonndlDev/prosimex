/**
 * @file auth.service.js
 * Business logic for the auth module — read path only.
 *
 * getMe (Type E) is the only read endpoint; it is handled here.
 * Mutations (login, refreshToken) are preserved in __legacy__/auth.controller.legacy.js
 * and re-exported from the slim controller.
 *
 * Query count per operation:
 *   getMe: 1 (single-row SELECT with roles JOIN)
 */

import { db } from '../../shared/db/index.js';
import { mergeEffectivePermissions } from '../../utils/permissions.util.js';

const SQL_USER_WITH_ROLE = `
  SELECT u.*, r.name as role_name, r.permissions as role_permissions
  FROM users u
  JOIN roles r ON u.role_id = r.id
`;

/**
 * Fetch the profile of the currently authenticated user.
 * Returns the same shape as the original getMe handler.
 *
 * @param {number|string} userId
 * @returns {Promise<object>}
 * @throws {Error} with status=404 if user not found
 */
async function getMe(userId) {
  const { rows, rowCount } = await db.query(
    `${SQL_USER_WITH_ROLE} WHERE u.id = $1 AND u.deleted_at IS NULL`,
    [userId],
  );

  if (rowCount === 0) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const user = rows[0];
  const effectivePermissions = mergeEffectivePermissions(user.permissions, user.role_permissions);

  return {
    id: user.id,
    username: user.username,
    role: user.role_name,
    factory_id: user.factory_id,
    permissions: effectivePermissions,
    is_active: user.is_active,
    full_name: user.full_name,
    phone: user.phone,
    email: user.email,
  };
}

export const authService = {
  getMe,
};
