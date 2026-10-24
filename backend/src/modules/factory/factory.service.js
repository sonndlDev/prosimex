/**
 * @file factory.service.js
 * Business logic for the factory module — read path only.
 * Mutations (create/update/delete) are preserved in __legacy__/factory.controller.legacy.js
 * and re-exported from the slim controller.
 */

import { factoriesDal } from '../../dal/factories.dal.js';
import { buildWhere, ORDER_BY } from './factory.filters.js';
import { hydrate } from './factory.hydrator.js';
import { mapList } from './factory.mapper.js';
import { SqlParams } from '../../shared/db/sql-builder.js';

/**
 * List factories with pagination and optional search.
 * Returns same shape as original getFactories: { data, total, page, limit }.
 *
 * Query count: 3 (COUNT + list SELECT + user batch)
 *
 * @param {{ search?: string }} filters
 * @param {{ page?: number|string, limit?: number|string }} pagination
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
async function getFactories({ search = '' } = {}, { page = 1, limit = 10 } = {}) {
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const offset = (pageInt - 1) * limitInt;

  const params = new SqlParams();
  const where = buildWhere({ search }, params);

  const [total, rows] = await Promise.all([
    factoriesDal.count(where.toString(), params.values),
    factoriesDal.findList(where.toString(), ORDER_BY, limitInt, offset, params.values),
  ]);

  await hydrate(rows);

  return {
    data: mapList(rows),
    total,
    page: pageInt,
    limit: limitInt,
  };
}

export const factoryService = {
  getFactories,
};
