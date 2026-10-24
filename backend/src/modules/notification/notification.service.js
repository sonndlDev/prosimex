/**
 * @file notification.service.js
 * Business logic for the notification module — read path only.
 * Mutations (markAsRead, markAllAsRead) are preserved in
 * __legacy__/notification.controller.legacy.js and re-exported from the slim controller.
 *
 * Type E: Simple read with dynamic IN clause.
 * No pagination, no hydration, no mapper.
 * SQL kept directly in the service (dynamic placeholders make a DAL unwieldy).
 *
 * Response shape: { success: true, data: [...], unreadCount: number }
 */

import { db } from '../../shared/db/index.js';

/**
 * Build the list of target_roles a user can see, matching original logic exactly.
 *
 * @param {{ role_name: string, permissions: string[] }} user
 * @returns {string[]}
 */
function resolveTargetRoles(user) {
  const { role_name, permissions = [] } = user;
  const targetRoles = [role_name];
  if (
    role_name === 'ADMIN' ||
    (permissions.includes('daily_tickets:auto_approve') && !targetRoles.includes('PLANNER'))
  ) {
    if (!targetRoles.includes('PLANNER')) targetRoles.push('PLANNER');
  }
  return targetRoles;
}

/**
 * Fetch notifications for a user.
 *
 * @param {{ id: number|string, role_name: string, permissions: string[] }} user
 * @returns {Promise<{ success: true, data: object[], unreadCount: number }>}
 */
async function getNotifications(user) {
  const { id: user_id } = user;
  const targetRoles = resolveTargetRoles(user);

  const placeholders = targetRoles.map((_, i) => `$${i + 2}`).join(', ');
  const query = `
      SELECT id, message, link, is_read, created_at
      FROM notifications
      WHERE user_id = $1 OR target_role IN (${placeholders})
      ORDER BY created_at DESC
      LIMIT 50
    `;
  const result = await db.query(query, [user_id, ...targetRoles]);

  const unreadCount = result.rows.filter(n => !n.is_read).length;

  return {
    success: true,
    data: result.rows,
    unreadCount,
  };
}

export const notificationService = {
  getNotifications,
};
