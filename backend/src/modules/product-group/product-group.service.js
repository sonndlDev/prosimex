/**
 * @file product-group.service.js
 * Business logic for the product-group module — read path only.
 * Mutations are preserved in __legacy__/product-group.controller.legacy.js
 * and re-exported from the slim controller.
 *
 * Function classifications:
 *   getProductGroups          — Type A (paginated list with user JOINs)
 *   getProductGroupOperations — Type C (conditional SQL with correlated subqueries)
 *   getStageConfigs           — Type C (multi-query aggregation)
 *   exportProductGroups       — Type C (multi-table JOIN for export, no pagination)
 */

import { db } from '../../shared/db/index.js';
import { buildWhereUnaliased, buildWhere } from './product-group.filters.js';
import {
  SQL_PGO_WITH_CONTEXT,
  SQL_PGO_BASE,
  SQL_PGO_NULL_OP_ACTUAL,
  SQL_STAGE_CONFIGS,
  SQL_STAGE_PRODUCTS,
  SQL_STAGE_OPS_COUNT,
  SQL_EXPORT_BASE,
} from './queries/product-group.sql.js';

// ── Type A ───────────────────────────────────────────────────────────────────

/**
 * Paginated list of product groups with creator/modifier names.
 *
 * @param {{ factory_id?: string, search?: string }} filters
 * @param {{ page?: number|string, limit?: number|string }} pagination
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
async function getProductGroups(filters = {}, { page = 1, limit = 10 } = {}) {
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const offsetInt = (pageInt - 1) * limitInt;

  const { where: whereUnaliased, params } = buildWhereUnaliased(filters);
  const { where: whereAliased } = buildWhere(filters);

  const [countResult, result] = await Promise.all([
    db.query(`SELECT COUNT(*) FROM product_groups ${whereUnaliased}`, params),
    db.query(
      `SELECT pg.*, COALESCE(cu.full_name, cu.username) as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name
       FROM product_groups pg
       LEFT JOIN users cu ON pg.created_by = cu.id
       LEFT JOIN users mu ON pg.modified_by = mu.id
       ${whereAliased}
       ORDER BY pg.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitInt, offsetInt]
    ),
  ]);

  return {
    data: result.rows,
    total: parseInt(countResult.rows[0].count),
    page: pageInt,
    limit: limitInt,
  };
}

// ── Type C ───────────────────────────────────────────────────────────────────

/**
 * List product group operations, optionally enriched with order/product context.
 *
 * @param {string} productGroupId
 * @param {{ order_id?: string, product_id?: string }} context
 * @returns {Promise<object[]>}
 */
async function getProductGroupOperations(productGroupId, { order_id, product_id } = {}) {
  let rows;

  if (order_id && product_id) {
    const result = await db.query(SQL_PGO_WITH_CONTEXT, [productGroupId, order_id, product_id]);
    rows = result.rows;

    // Append manual production row (product_group_operation_id IS NULL) if present
    const nullOpRes = await db.query(SQL_PGO_NULL_OP_ACTUAL, [order_id, product_id]);
    const nullActualQty = parseFloat(nullOpRes.rows[0].total_actual) || 0;

    if (nullActualQty > 0) {
      rows = [
        ...rows,
        {
          id: null,
          product_group_id: productGroupId,
          operation_id: null,
          operation_name: 'Không công đoạn',
          machine_names: null,
          machine_ids: null,
          sequence_order: null,
          dinh_muc: null,
          is_planned: false,
          total_actual: nullOpRes.rows[0].total_actual,
          order_quantity: nullOpRes.rows[0].order_quantity,
          deleted_at: null,
        },
      ];
    }
  } else {
    const result = await db.query(SQL_PGO_BASE, [productGroupId]);
    rows = result.rows;
  }

  return rows;
}

/**
 * Get stage configs (xi_ma / dong_goi flags) for each product in the group.
 *
 * @param {string} productGroupId
 * @returns {Promise<{ data: object[], has_operations: boolean }>}
 */
async function getStageConfigs(productGroupId) {
  const [configsRes, productsRes, opsCountRes] = await Promise.all([
    db.query(SQL_STAGE_CONFIGS, [productGroupId]),
    db.query(SQL_STAGE_PRODUCTS, [productGroupId]),
    db.query(SQL_STAGE_OPS_COUNT, [productGroupId]),
  ]);

  const configsMap = {};
  configsRes.rows.forEach(r => { configsMap[r.product_id] = r; });

  const data = productsRes.rows.map(p => ({
    product_id: p.id,
    product_name: p.name,
    product_group_id: parseInt(productGroupId),
    has_xi_ma: configsMap[p.id]?.has_xi_ma || false,
    has_dong_goi: configsMap[p.id]?.has_dong_goi || false,
  }));

  return { data, has_operations: parseInt(opsCountRes.rows[0].count) > 0 };
}

/**
 * Export all product group data (no pagination).
 *
 * @param {{ factory_id?: string, search?: string }} filters
 * @returns {Promise<object[]>}
 */
async function exportProductGroups(filters = {}) {
  const { where, params } = buildWhere(filters);

  const query = `${SQL_EXPORT_BASE}
    ${where}
    ORDER BY pg.name ASC, p.name ASC, pgo.sequence_order ASC`;

  const result = await db.query(query, params);
  return result.rows;
}

export const productGroupService = {
  getProductGroups,
  getProductGroupOperations,
  getStageConfigs,
  exportProductGroups,
};
