/**
 * @file activities.sql.js
 * Named SQL constants for the dashboard activities endpoint.
 * Type C: paginated audit_log query with user JOIN.
 * SQL kept exactly as found in original controller.
 */

export const SQL_ACTIVITIES_COUNT = `
  SELECT COUNT(*) FROM audit_logs
`;

export const SQL_ACTIVITIES_LIST = `
  SELECT
    al.id,
    al.action,
    al.entity,
    al.entity_id,
    al.before_data,
    al.after_data,
    al.created_at,
    COALESCE(u.full_name, u.username, 'Hệ thống') AS user_name
  FROM audit_logs al
  LEFT JOIN users u ON al.user_id = u.id
  ORDER BY al.created_at DESC
  LIMIT $1 OFFSET $2
`;
