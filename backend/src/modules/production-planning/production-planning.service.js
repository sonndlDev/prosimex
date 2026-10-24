import { db } from '../../shared/db/index.js';
import {
  SQL_COUNT_PLANS,
  SQL_FIND_PLANS,
  SQL_FIND_PLAN_DAYS,
} from './queries/plans.sql.js';

/**
 * Build WHERE clause and params for production_plans queries.
 * @param {object} filters
 * @returns {{ clause: string, params: any[] }}
 */
function buildWhereClause(filters) {
  const {
    order_ids,
    product_ids,
    machine_ids,
    operation_ids,
    startDate,
    endDate,
    product_id,
    machine_id,
  } = filters;

  let clause = 'WHERE pp.deleted_at IS NULL';
  const params = [];

  const toArr = (v) =>
    v ? (Array.isArray(v) ? v : v.split(',').filter(Boolean)) : [];

  const orderIdsArr = toArr(order_ids);
  if (orderIdsArr.length > 0) {
    params.push(orderIdsArr);
    clause += ` AND pp.order_id = ANY($${params.length})`;
  }

  const productIdsArr = toArr(product_ids);
  if (productIdsArr.length > 0) {
    params.push(productIdsArr);
    clause += ` AND pp.product_id = ANY($${params.length})`;
  } else if (product_id) {
    params.push(product_id);
    clause += ` AND pp.product_id = $${params.length}`;
  }

  const machineIdsArr = toArr(machine_ids);
  if (machineIdsArr.length > 0) {
    params.push(machineIdsArr);
    clause += ` AND pp.machine_id = ANY($${params.length})`;
  } else if (machine_id) {
    params.push(machine_id);
    clause += ` AND pp.machine_id = $${params.length}`;
  }

  const operationIdsArr = toArr(operation_ids);
  if (operationIdsArr.length > 0) {
    params.push(operationIdsArr);
    clause += ` AND pp.product_group_operation_id IN (SELECT pgo_f.id FROM product_group_operations pgo_f WHERE pgo_f.operation_id = ANY($${params.length}) AND pgo_f.deleted_at IS NULL)`;
  }

  if (startDate || endDate) {
    let existsCond = `EXISTS (
      SELECT 1 FROM production_plan_days ppd_filter
      WHERE ppd_filter.production_plan_id = pp.id
      AND ppd_filter.deleted_at IS NULL`;
    if (startDate) {
      params.push(startDate);
      existsCond += ` AND ppd_filter.working_date::DATE >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      existsCond += ` AND ppd_filter.working_date::DATE <= $${params.length}`;
    }
    existsCond += `)`;
    clause += ` AND ${existsCond}`;
  }

  return { clause, params };
}

export const productionPlanningService = {
  async getPlans(filters, { limit, offset }) {
    const { clause, params } = buildWhereClause(filters);

    const [countRes, dataRes] = await Promise.all([
      db.query(
        `${SQL_COUNT_PLANS} ${clause}`,
        params,
      ),
      db.query(
        `${SQL_FIND_PLANS} ${clause}
         ORDER BY p.name ASC, pgo.sequence_order ASC, pp.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      ),
    ]);

    const total = parseInt(countRes.rows[0].count);
    const rows = dataRes.rows;

    if (rows.length === 0) {
      return { total, rows: rows.map((r) => ({ ...r, days: [] })) };
    }

    const planIds = rows.map((r) => r.id);
    const daysRes = await db.query(SQL_FIND_PLAN_DAYS, [planIds]);

    const daysMap = {};
    for (const day of daysRes.rows) {
      if (!daysMap[day.production_plan_id]) daysMap[day.production_plan_id] = [];
      daysMap[day.production_plan_id].push(day);
    }

    return {
      total,
      rows: rows.map((plan) => ({ ...plan, days: daysMap[plan.id] || [] })),
    };
  },
};
