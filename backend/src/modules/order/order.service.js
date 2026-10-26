/**
 * @file order.service.js
 * Business logic for the order module.
 *
 * Read methods classification (all Type C):
 *   - getOrders             : 5-CTE list query — SQL_ORDERS_LIST
 *   - getOrderById          : same 5-CTE structure, single row — SQL_ORDER_BY_ID
 *   - getCompletionReport   : multi-CTE aggregation, two paths (DONE/LIVE)
 *                             — SQL_COMPLETION_REPORT_DONE / SQL_COMPLETION_REPORT_LIVE
 *   - getProductSnapshots   : count + data with dynamic WHERE + drift filter
 *                             — SQL_PRODUCT_SNAPSHOTS_COUNT / SQL_PRODUCT_SNAPSHOTS_LIST
 *
 * Write methods (Type D — delegated to legacy repository):
 *   - createOrder, deleteOrder: use orderRepository transaction helpers.
 */

import { db } from '../../shared/db/index.js';
import { orderRepository } from './__legacy__/order.repository.legacy.js';
import { insertOrderProductWithSnapshot } from '../../utils/order-product-snapshot.util.js';
import {
  SQL_ORDERS_COUNT,
  SQL_ORDERS_LIST,
  SQL_ORDERS_LIST_ORDER,
  SQL_ORDER_BY_ID,
  SQL_ORDER_STATUS_BY_ID,
  SQL_COMPLETION_REPORT_DONE,
  SQL_COMPLETION_REPORT_LIVE,
  SQL_PRODUCT_SNAPSHOTS_COUNT,
  SQL_PRODUCT_SNAPSHOTS_LIST,
  SQL_PRODUCT_SNAPSHOTS_ORDER,
  SQL_ORDER_LABOR_SUMMARY,
} from './queries/order.sql.js';

// ---------------------------------------------------------------------------
// Filter builder — pure function, no DB calls
// ---------------------------------------------------------------------------

/**
 * Build a dynamic WHERE clause from the provided filter object.
 * Returns { clause: string, params: Array }.
 *
 * @param {object} filters
 * @returns {{ clause: string, params: Array }}
 */
function buildOrdersWhereClause(filters) {
  const {
    factory_id,
    search,
    status,
    customer_id,
    product_id,
    person_in_charge,
    location,
    startDate,
    endDate,
    dateType = 'received',
  } = filters;

  let whereClause = 'WHERE o.deleted_at IS NULL';
  const params = [];

  if (factory_id && factory_id !== 'ALL') {
    params.push(factory_id);
    whereClause += ` AND o.factory_id = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (o.name ILIKE $${params.length} OR o.order_code ILIKE $${params.length} OR c.name ILIKE $${params.length} OR o.po_customer ILIKE $${params.length})`;
  }

  if (status && status !== 'ALL') {
    if (status === 'INCOMPLETE') {
      whereClause += ` AND o.status != 'DONE'`;
    } else {
      params.push(status);
      whereClause += ` AND o.status = $${params.length}`;
    }
  }

  if (customer_id && customer_id !== 'ALL') {
    params.push(customer_id);
    whereClause += ` AND o.customer_id = $${params.length}`;
  }

  if (product_id && product_id !== 'ALL') {
    params.push(product_id);
    whereClause += ` AND EXISTS (
      SELECT 1 FROM order_products op_f
      JOIN products p_f ON op_f.product_id = p_f.id AND p_f.deleted_at IS NULL
      WHERE op_f.order_id = o.id AND op_f.product_id = $${params.length}
    )`;
  }

  if (person_in_charge) {
    params.push(`%${person_in_charge}%`);
    whereClause += ` AND o.person_in_charge ILIKE $${params.length}`;
  }

  if (location) {
    params.push(`%${location}%`);
    whereClause += ` AND o.production_location ILIKE $${params.length}`;
  }

  if (startDate && endDate) {
    if (dateType === 'shipping' || dateType === 'container') {
      const jsonbCol =
        dateType === 'shipping'
          ? 'oe.expected_shipping_date'
          : 'oe.expected_container_shipping_date';
      whereClause += ` AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(${jsonbCol}) d WHERE d::date >= $${params.length + 1} AND d::date <= $${params.length + 2})`;
      params.push(startDate);
      params.push(endDate);
    } else {
      let dateCol = 'o.received_date';
      if (dateType === 'production_start') dateCol = 'oe.production_start_date';

      params.push(startDate);
      whereClause += ` AND ${dateCol} >= $${params.length}`;
      params.push(endDate);
      whereClause += ` AND ${dateCol} <= $${params.length}`;
    }
  }

  return { clause: whereClause, params };
}

/**
 * Build a dynamic WHERE clause for the product snapshots query.
 *
 * @param {{ search?: string, order_id?: string|number, drift_only?: string }} filters
 * @returns {{ clause: string, params: Array }}
 */
function buildSnapshotsWhereClause({ search, order_id, drift_only }) {
  let whereClause = "WHERE o.deleted_at IS NULL AND o.status = 'DONE'";
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    const i = params.length;
    whereClause += ` AND (
      o.order_code ILIKE $${i} OR o.name ILIKE $${i}
      OR op.product_name ILIKE $${i} OR p.name ILIKE $${i}
      OR op.product_group_name ILIKE $${i}
    )`;
  }

  if (order_id) {
    params.push(order_id);
    whereClause += ` AND o.id = $${params.length}`;
  }

  if (drift_only === 'true' || drift_only === '1') {
    whereClause += ` AND (
      (op.product_name IS NOT NULL AND p.name IS DISTINCT FROM op.product_name)
      OR (op.product_group_id IS NOT NULL AND p.product_group_id IS DISTINCT FROM op.product_group_id)
    )`;
  }

  return { clause: whereClause, params };
}

// ---------------------------------------------------------------------------
// Completion percentage — pure function, no DB calls
// ---------------------------------------------------------------------------

/**
 * Calculate completion percentage for a single order-product row.
 *
 * @param {object} row
 * @returns {number}
 */
function calcCompletionPercentage(row) {
  const required = parseFloat(row.required_quantity) || 0;
  const sxRaw = parseFloat(row.sx_quantity) || 0;
  const inventory = parseFloat(row.inventory_input) || 0;
  const platingOut = parseFloat(row.plating_out_quantity) || 0;
  const platingReturned = parseFloat(row.plating_returned_quantity) || 0;
  const packagingOut = parseFloat(row.packaging_out_quantity) || 0;
  const stageCount = parseInt(row.stage_count) || 0;

  // inventory boosts all stage quantities
  const platingOutEffective = platingOut + inventory;
  const platingReturnedEffective = platingReturned + inventory;
  const packagingOutEffective = packagingOut + inventory;
  const sxEffective = sxRaw + inventory;

  let percentage = 0;
  if (stageCount === 4 && required > 0) {
    percentage =
      (Math.min(platingOutEffective, required) * 100 / required +
        Math.min(platingReturnedEffective, required) * 100 / required +
        Math.min(packagingOutEffective, required) * 100 / required +
        Math.min(sxEffective, required) * 100 / required) /
      4;
  } else if (stageCount === 2 && required > 0) {
    percentage =
      (Math.min(packagingOutEffective, required) * 100 / required +
        Math.min(sxEffective, required) * 100 / required) /
      2;
  } else if (stageCount === 0 && required > 0) {
    percentage = Math.min(sxEffective, required) * 100 / required;
  }
  return Math.round(percentage * 100) / 100;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const orderService = {
  /**
   * Paginated order list.
   * Type C: 5-CTE query computing per-product actuals + per-order completion percentage.
   *
   * @param {object} filters
   * @param {{ page?: number|string, limit?: number|string }} pagination
   * @returns {Promise<{ data: Array, total: number, page: number, limit: number }>}
   */
  async getOrders(filters, pagination) {
    const { page = 1, limit = 10 } = pagination;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = (pageInt - 1) * limitInt;

    const { clause, params } = buildOrdersWhereClause(filters);

    const [countRes, listRes] = await Promise.all([
      db.query(`${SQL_ORDERS_COUNT} ${clause}`, params),
      db.query(
        `${SQL_ORDERS_LIST} ${clause} ${SQL_ORDERS_LIST_ORDER} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitInt, offsetInt],
      ),
    ]);

    return {
      data: listRes.rows,
      total: parseInt(countRes.rows[0].count),
      page: pageInt,
      limit: limitInt,
    };
  },

  /**
   * Fetch a single order by ID.
   * Type C: same 5-CTE structure as the list query, single row output.
   *
   * @param {number|string} id
   * @returns {Promise<object|null>}
   */
  async getOrderById(id) {
    const result = await db.query(SQL_ORDER_BY_ID, [id]);
    return result.rows[0] || null;
  },

  /**
   * Completion report for an order.
   * Type C: multi-CTE aggregation with two paths (DONE snapshot / LIVE live-config).
   * JS post-processing: calcCompletionPercentage + overall rollup.
   *
   * @param {number|string} orderId
   * @returns {Promise<{ data: Array, overall_completion_percentage: number }|null>}
   */
  async getCompletionReport(orderId) {
    const statusRes = await db.query(SQL_ORDER_STATUS_BY_ID, [orderId]);
    if (statusRes.rowCount === 0) return null;

    const isDone = statusRes.rows[0].status === 'DONE';
    const sql = isDone ? SQL_COMPLETION_REPORT_DONE : SQL_COMPLETION_REPORT_LIVE;

    // Chay song song: completion data + labor summary
    const [completionRes, laborRes] = await Promise.all([
      db.query(sql, [orderId]),
      db.query(SQL_ORDER_LABOR_SUMMARY, [orderId]),
    ]);

    const data = completionRes.rows.map((row) => {
      const percentage = calcCompletionPercentage(row);
      return {
        ...row,
        sx_quantity: parseFloat(row.sx_quantity) || 0,
        plating_out_quantity: parseFloat(row.plating_out_quantity) || 0,
        plating_returned_quantity: parseFloat(row.plating_returned_quantity) || 0,
        packaging_out_quantity: parseFloat(row.packaging_out_quantity) || 0,
        completion_percentage: percentage,
      };
    });

    const totalProducts = data.length;
    const totalCompletion = data.reduce((sum, r) => sum + r.completion_percentage, 0);
    const overall_completion_percentage =
      totalProducts > 0 ? Math.round((totalCompletion / totalProducts) * 100) / 100 : 0;

    const lr = laborRes.rows[0] || {};
    const laborSummary = {
      planned_labor: parseFloat(lr.planned_labor) || 0,
      actual_labor: parseFloat(lr.actual_labor) || 0,
      labor_diff: parseFloat(lr.labor_diff) || 0,
      labor_diff_pct:
        lr.labor_diff_pct !== null && lr.labor_diff_pct !== undefined
          ? parseFloat(lr.labor_diff_pct)
          : null,
    };

    return { data, overall_completion_percentage, ...laborSummary };
  },

  /**
   * Product snapshots list (paginated).
   * Type C: count + data query with dynamic WHERE including drift filter.
   *
   * @param {object} queryParams
   * @returns {Promise<{ data: Array, total: number, page: number, limit: number }>}
   */
  async getProductSnapshots(queryParams) {
    const { page = 1, limit = 20, search = '', order_id, drift_only } = queryParams;
    const pageInt = parseInt(page) || 1;
    const limitInt = Math.min(parseInt(limit) || 20, 100);
    const offsetInt = (pageInt - 1) * limitInt;

    const { clause, params } = buildSnapshotsWhereClause({ search, order_id, drift_only });

    const [countRes, listRes] = await Promise.all([
      db.query(`${SQL_PRODUCT_SNAPSHOTS_COUNT} ${clause}`, params),
      db.query(
        `${SQL_PRODUCT_SNAPSHOTS_LIST} ${clause} ${SQL_PRODUCT_SNAPSHOTS_ORDER} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limitInt, offsetInt],
      ),
    ]);

    return {
      data: listRes.rows,
      total: parseInt(countRes.rows[0].count),
      page: pageInt,
      limit: limitInt,
    };
  },

  /**
   * Create a new order (Type D — transactional write).
   * Delegates to legacy repository transaction helpers.
   *
   * @param {object} body
   * @param {number|string} userId
   * @returns {Promise<object>}
   */
  async createOrder(body, userId) {
    const {
      order_code,
      name,
      customer_id,
      product_items,
      product_ids,
      po_customer,
      po_auto_code,
      received_date,
      delivery_date,
      quantity,
      production_location,
      person_in_charge,
      note,
      factory_id,
      production_start_date,
      expected_shipping_date,
      expected_container_shipping_date,
      customer_confirmation_result,
      pallet_info,
      accessory_status,
      expected_material_date,
      actual_material_date,
    } = body;

    const items =
      product_items ||
      (product_ids
        ? product_ids.map((id) => ({ product_id: id, quantity: quantity || 0 }))
        : []);
    const totalQuantity =
      items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) || quantity || 0;
    const firstProductId = items.length > 0 ? items[0].product_id : null;

    const hasExt =
      production_start_date ||
      expected_shipping_date ||
      expected_container_shipping_date ||
      customer_confirmation_result ||
      pallet_info ||
      accessory_status ||
      expected_material_date ||
      actual_material_date;

    return orderRepository.transaction(async (client) => {
      const orderId = await orderRepository.insertOrder(client, {
        order_code,
        name,
        customer_id,
        firstProductId,
        po_customer,
        received_date,
        delivery_date,
        totalQuantity,
        production_location,
        person_in_charge,
        note,
        factory_id,
        created_by: userId,
      });

      for (const item of items) {
        await insertOrderProductWithSnapshot(client, orderId, item.product_id, item.quantity);
      }

      const newOrder = await orderRepository.updatePoAutoCode(client, orderId, po_auto_code);

      if (hasExt) {
        await orderRepository.upsertOrderExt(client, orderId, {
          production_start_date,
          expected_shipping_date,
          expected_container_shipping_date,
          customer_confirmation_result,
          pallet_info,
          accessory_status,
          expected_material_date,
          actual_material_date,
        });
      }

      await orderRepository.insertAuditLog(client, {
        userId,
        action: 'CREATE',
        entity: 'Order',
        entityId: orderId,
        afterData: newOrder,
      });

      return newOrder;
    });
  },

  /**
   * Soft-delete an order (Type D — transactional write).
   * Delegates to legacy repository transaction helpers.
   *
   * @param {number|string} id
   * @param {number|string} userId
   * @returns {Promise<void>}
   */
  async deleteOrder(id, userId) {
    return orderRepository.transaction(async (client) => {
      const beforeData = await orderRepository.findForDelete(client, id);
      if (!beforeData) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
      }

      await orderRepository.softDelete(client, id);

      await orderRepository.insertAuditLog(client, {
        userId,
        action: 'DELETE',
        entity: 'Order',
        entityId: id,
        beforeData,
      });
    });
  },
};
