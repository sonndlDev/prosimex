import { BaseRepository } from '~/shared/base.repository.js';

export class ProductionPlanningRepository extends BaseRepository {
  buildWhereClause(filters) {
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

    // Normalize order_ids to array
    const orderIdsArr = toArr(order_ids);
    if (orderIdsArr.length > 0) {
      params.push(orderIdsArr);
      clause += ` AND pp.order_id = ANY($${params.length})`;
    }

    // Normalize product_ids to array
    const productIdsArr = toArr(product_ids);
    if (productIdsArr.length > 0) {
      params.push(productIdsArr);
      clause += ` AND pp.product_id = ANY($${params.length})`;
    } else if (product_id) {
      params.push(product_id);
      clause += ` AND pp.product_id = $${params.length}`;
    }

    // Normalize machine_ids to array
    const machineIdsArr = toArr(machine_ids);
    if (machineIdsArr.length > 0) {
      params.push(machineIdsArr);
      clause += ` AND pp.machine_id = ANY($${params.length})`;
    } else if (machine_id) {
      params.push(machine_id);
      clause += ` AND pp.machine_id = $${params.length}`;
    }

    // Normalize operation_ids to array
    const operationIdsArr = toArr(operation_ids);
    if (operationIdsArr.length > 0) {
      params.push(operationIdsArr);
      clause += ` AND pp.product_group_operation_id IN (SELECT pgo_f.id FROM product_group_operations pgo_f WHERE pgo_f.operation_id = ANY($${params.length}) AND pgo_f.deleted_at IS NULL)`;
    }

    // Filter: keep plans that have actual working days in the requested date window.
    // Uses EXISTS on production_plan_days so inclusive date matching is exact
    // and avoids TIMESTAMP vs DATE ambiguity that broke single-day filters.
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

  async countPlans(filters) {
    const { clause, params } = this.buildWhereClause(filters);
    const result = await this.query(
      `SELECT COUNT(DISTINCT pp.id)
       FROM production_plans pp
       LEFT JOIN orders o ON pp.order_id = o.id
       ${clause}`,
      params,
    );
    return parseInt(result.rows[0].count);
  }

  async findPlans(filters, { limit, offset }) {
    const { clause, params } = this.buildWhereClause(filters);

    // Get paginated data
    const result = await this.query(
      `
            SELECT
                pp.*,
                o.order_code,
                o.name as order_name,
                o.po_customer,
                COALESCE(op_qty.quantity, o.quantity, 0) as quantity,
                COALESCE(op_qty.quantity, o.quantity, 0) as product_quantity,
                COALESCE(op_qty.product_name, p.name) as product_name,
                COALESCE(op_qty.product_group_name, pg.name) as product_group_name,
                pgo.sequence_order,
                COALESCE(pp.dinh_muc, pgo.dinh_muc) as dinh_muc,
                op.name as operation_name,
                op.description as operation_note,
                pp.machine_id as machine_id,
                m.name as machine_name,
                m.code as machine_code,
                f.name as factory_name,
                COALESCE(cu.full_name, cu.username) as creator_name,
                COALESCE(mu.full_name, mu.username) as modifier_name
            FROM production_plans pp
            LEFT JOIN orders o ON pp.order_id = o.id
            LEFT JOIN products p ON pp.product_id = p.id
            LEFT JOIN order_products op_qty ON op_qty.order_id = pp.order_id AND op_qty.product_id = pp.product_id
            LEFT JOIN product_groups pg ON pg.id = COALESCE(op_qty.product_group_id, p.product_group_id)
            LEFT JOIN product_group_operations pgo ON pp.product_group_operation_id = pgo.id
            LEFT JOIN operations op ON pgo.operation_id = op.id
            LEFT JOIN machines m ON pp.machine_id = m.id
            LEFT JOIN factories f ON pp.factory_id = f.id
            LEFT JOIN users cu ON pp.created_by = cu.id
            LEFT JOIN users mu ON pp.modified_by = mu.id
            ${clause}
            ORDER BY p.name ASC, pgo.sequence_order ASC, pp.created_at DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
      [...params, limit, offset],
    );

    // Fix N+1: Fetch tất cả days của tất cả plans trong 1 query duy nhất
    let plansWithDays = result.rows.map((plan) => ({ ...plan, days: [] }));

    if (result.rows.length > 0) {
      const planIds = result.rows.map((r) => r.id);
      const allDaysRes = await this.query(
        `SELECT
              ppd.production_plan_id,
              ppd.working_date,
              ppd.planned_work_quantity,
              ppd.is_overtime,
              (SELECT COUNT(*) FROM worker_plan_assignments wpa
               WHERE wpa.production_plan_id = ppd.production_plan_id
               AND wpa.working_date = ppd.working_date) as worker_count,
              (SELECT string_agg(w.name, ', ') FROM worker_plan_assignments wpa
               JOIN workers w ON wpa.worker_id = w.id
               WHERE wpa.production_plan_id = ppd.production_plan_id
               AND wpa.working_date = ppd.working_date) as worker_names
           FROM production_plan_days ppd
           WHERE ppd.production_plan_id = ANY($1)
           AND ppd.deleted_at IS NULL
           ORDER BY ppd.working_date ASC`,
        [planIds],
      );

      // Group days theo plan_id bằng JS (không cần thêm query)
      const daysMap = {};
      for (const day of allDaysRes.rows) {
        if (!daysMap[day.production_plan_id]) daysMap[day.production_plan_id] = [];
        daysMap[day.production_plan_id].push(day);
      }

      plansWithDays = result.rows.map((plan) => ({
        ...plan,
        days: daysMap[plan.id] || [],
      }));
    }

    return plansWithDays;
  }

  async insertAuditLog(client, { userId, action, entity, entityId, beforeData, afterData }) {
    if (beforeData !== undefined && afterData !== undefined) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
               VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, action, entity, entityId, beforeData, afterData],
      );
    } else if (beforeData !== undefined) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data)
               VALUES ($1, $2, $3, $4, $5)`,
        [userId, action, entity, entityId, beforeData],
      );
    } else {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
               VALUES ($1, $2, $3, $4, $5)`,
        [userId, action, entity, entityId, afterData],
      );
    }
  }
}

export const productionPlanningRepository = new ProductionPlanningRepository();
