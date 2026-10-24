/**
 * @file dashboard.service.js
 * Business logic for the dashboard module.
 *
 * Both functions are Type C (aggregation/report):
 *   - getMetrics: 10 parallel SQL queries, no batch key, post-processed in JS
 *   - getActivities: paginated audit_log list with user JOIN
 *
 * SQL is extracted to named constants in queries/*.sql.js — kept verbatim.
 * No DAL, no hydrator, no mapper.
 */

import { db } from '../../shared/db/index.js';
import {
  SQL_ORDERS_BY_STATUS,
  SQL_ACTIVE_PLANS_COUNT,
  SQL_MACHINES_SUMMARY,
  SQL_ACTIVE_USERS_COUNT,
  SQL_TODAY_ATTENDANCE_SUMMARY,
  SQL_TOTAL_WORKERS_COUNT,
  SQL_MY_ATTENDANCE,
  SQL_URGENT_ORDERS,
  SQL_PRODUCTION_PROGRESS,
  SQL_RECENT_ACTIVITIES,
} from './queries/metrics.sql.js';
import { SQL_ACTIVITIES_COUNT, SQL_ACTIVITIES_LIST } from './queries/activities.sql.js';

/**
 * Aggregate all dashboard metrics in a single parallel fetch.
 *
 * @param {{ userId: number|string }} context
 * @returns {Promise<object>} Dashboard metrics payload
 */
async function getMetrics({ userId }) {
  const [
    ordersByStatusRes,
    plansCount,
    machinesQuery,
    usersCount,
    todayAttendanceRes,
    totalWorkersRes,
    myAttendanceRes,
    urgentOrdersRes,
    productionProgressRes,
    activities,
  ] = await Promise.all([
    db.query(SQL_ORDERS_BY_STATUS),
    db.query(SQL_ACTIVE_PLANS_COUNT),
    db.query(SQL_MACHINES_SUMMARY),
    db.query(SQL_ACTIVE_USERS_COUNT),
    db.query(SQL_TODAY_ATTENDANCE_SUMMARY),
    db.query(SQL_TOTAL_WORKERS_COUNT),
    db.query(SQL_MY_ATTENDANCE, [userId]),
    db.query(SQL_URGENT_ORDERS),
    db.query(SQL_PRODUCTION_PROGRESS),
    db.query(SQL_RECENT_ACTIVITIES),
  ]);

  const statusMap = {};
  for (const row of ordersByStatusRes.rows) {
    statusMap[row.status] = parseInt(row.count);
  }
  const ordersByStatus = {
    NOT_STARTED: statusMap['NOT_STARTED'] || 0,
    IN_PROGRESS: statusMap['IN_PROGRESS'] || 0,
    DONE: statusMap['DONE'] || 0,
    PARTIAL_SHIPPED: statusMap['PARTIAL_SHIPPED'] || 0,
    WAITING_CONTAINER: statusMap['WAITING_CONTAINER'] || 0,
  };
  const totalOrders = Object.values(ordersByStatus).reduce((a, b) => a + b, 0);

  const activePlans = parseInt(plansCount.rows[0].count);

  const totalMachines = parseInt(machinesQuery.rows[0].total) || 0;
  const activeMachinesCount = parseInt(machinesQuery.rows[0].active) || 0;
  const machineEfficiency = totalMachines > 0
    ? Math.round((activeMachinesCount / totalMachines) * 100)
    : 0;

  const activeUsers = parseInt(usersCount.rows[0].count);

  const todayAttendance = {
    checkedIn: parseInt(todayAttendanceRes.rows[0].checked_in) || 0,
    checkedOut: parseInt(todayAttendanceRes.rows[0].checked_out) || 0,
    totalWorkers: parseInt(totalWorkersRes.rows[0].count) || 0,
  };

  const myAttendance = myAttendanceRes.rowCount > 0 ? myAttendanceRes.rows[0] : null;

  const urgentOrders = urgentOrdersRes.rows.map(r => ({
    ...r,
    days_left: Math.ceil(parseFloat(r.days_left))
  }));

  const productionProgress = productionProgressRes.rows.map(r => {
    const total = parseFloat(r.total_quantity) || 0;
    const completed = parseFloat(r.completed_quantity) || 0;
    const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
    return { ...r, completion_pct: pct };
  });

  return {
    totalOrders,
    ordersByStatus,
    activePlans,
    activeMachines: machineEfficiency,
    activeUsers,
    todayAttendance,
    myAttendance,
    urgentOrders,
    productionProgress,
    activities: activities.rows,
  };
}

/**
 * Fetch paginated activity log.
 *
 * @param {{ page?: number|string, limit?: number|string }} pagination
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number, totalPages: number }>}
 */
async function getActivities({ page = 1, limit = 15 } = {}) {
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 15;
  const offset = (pageInt - 1) * limitInt;

  const [countResult, result] = await Promise.all([
    db.query(SQL_ACTIVITIES_COUNT),
    db.query(SQL_ACTIVITIES_LIST, [limitInt, offset]),
  ]);

  const total = parseInt(countResult.rows[0].count);

  return {
    data: result.rows,
    total,
    page: pageInt,
    limit: limitInt,
    totalPages: Math.ceil(total / limitInt),
  };
}

export const dashboardService = {
  getMetrics,
  getActivities,
};
