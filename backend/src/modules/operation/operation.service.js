/**
 * @file operation.service.js
 * Business logic for the operation module — read path only.
 * Mutations (create/update/delete) are preserved in __legacy__/operation.controller.legacy.js
 * and re-exported from the slim controller.
 */

import { operationsDal } from '../../dal/operations.dal.js';
import { buildWhere, ORDER_BY } from './operation.filters.js';
import { hydrate } from './operation.hydrator.js';
import { mapList } from './operation.mapper.js';
import { SqlParams } from '../../shared/db/sql-builder.js';

/**
 * List operations with pagination and optional search.
 * Returns same shape as original getOperations: { data, total, page, limit }.
 *
 * Query count: 3 (COUNT + list SELECT with json_agg + user batch)
 *
 * @param {{ search?: string }} filters
 * @param {{ page?: number|string, limit?: number|string }} pagination
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
async function getOperations({ search = '' } = {}, { page = 1, limit = 10 } = {}) {
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const offset = (pageInt - 1) * limitInt;

  const params = new SqlParams();
  const where = buildWhere({ search }, params);

  const [total, rows] = await Promise.all([
    operationsDal.count(where.toString(), params.values),
    operationsDal.findList(where.toString(), ORDER_BY, limitInt, offset, params.values),
  ]);

  await hydrate(rows);

  return {
    data: mapList(rows),
    total,
    page: pageInt,
    limit: limitInt,
  };
}

export const operationService = {
  getOperations,
};
