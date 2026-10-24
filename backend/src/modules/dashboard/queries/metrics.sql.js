/**
 * @file metrics.sql.js
 * Named SQL constants for the dashboard metrics endpoint.
 * Type C: multiple aggregation queries with no natural batch key.
 * SQL is kept exactly as found in the original controller — no rewrites.
 */

export const SQL_ORDERS_BY_STATUS = `
  SELECT status, COUNT(*) as count
  FROM orders
  WHERE deleted_at IS NULL
  GROUP BY status
`;

export const SQL_ACTIVE_PLANS_COUNT = `
  SELECT COUNT(*) FROM production_plans WHERE status IN ('RUNNING', 'PLANNED') AND deleted_at IS NULL
`;

export const SQL_MACHINES_SUMMARY = `
  SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM machines WHERE deleted_at IS NULL
`;

export const SQL_ACTIVE_USERS_COUNT = `
  SELECT COUNT(*)
  FROM users u
  JOIN roles r ON u.role_id = r.id
  WHERE u.is_active = true
    AND u.deleted_at IS NULL
    AND r.name NOT IN ('ADMIN', 'SUPER_ADMIN')
`;

export const SQL_TODAY_ATTENDANCE_SUMMARY = `
  SELECT
    COUNT(*) as checked_in,
    COUNT(*) FILTER (WHERE check_out_time IS NOT NULL) as checked_out
  FROM attendance
  WHERE date = CURRENT_DATE
`;

export const SQL_TOTAL_WORKERS_COUNT = `
  SELECT COUNT(*) FROM workers WHERE is_active = true AND deleted_at IS NULL
`;

export const SQL_MY_ATTENDANCE = `
  SELECT id, check_in_time, check_out_time FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE
`;

export const SQL_URGENT_ORDERS = `
  SELECT
    o.id, o.order_code, o.name, o.delivery_date, o.status,
    c.name as customer_name,
    EXTRACT(DAY FROM o.delivery_date - NOW()) as days_left
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  WHERE o.deleted_at IS NULL
    AND o.status != 'DONE'
    AND o.delivery_date IS NOT NULL
    AND o.delivery_date <= NOW() + INTERVAL '7 days'
  ORDER BY o.delivery_date ASC
  LIMIT 8
`;

export const SQL_PRODUCTION_PROGRESS = `
  SELECT
    o.id,
    o.order_code,
    o.name as order_name,
    c.name as customer_name,
    o.quantity as total_quantity,
    COALESCE(pq.completed_quantity, 0) as completed_quantity,
    o.delivery_date
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  LEFT JOIN (
    SELECT dti.order_id, SUM(dti.actual_quantity) as completed_quantity
    FROM daily_production_ticket_items dti
    JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
    WHERE dt.status = 'COMPLETED' AND dt.deleted_at IS NULL
    GROUP BY dti.order_id
  ) pq ON o.id = pq.order_id
  WHERE o.deleted_at IS NULL
    AND o.status = 'IN_PROGRESS'
  ORDER BY o.delivery_date ASC
  LIMIT 5
`;

export const SQL_RECENT_ACTIVITIES = `
  SELECT
    al.action,
    al.entity,
    al.created_at,
    COALESCE(u.full_name, u.username, 'Hệ thống') AS user_name
  FROM audit_logs al
  LEFT JOIN users u ON al.user_id = u.id
  ORDER BY al.created_at DESC
  LIMIT 5
`;
