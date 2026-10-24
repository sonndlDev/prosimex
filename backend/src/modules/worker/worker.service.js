/**
 * @file worker.service.js
 * Business logic for the worker module — read path only.
 * Mutations (create/update/delete) are preserved in __legacy__/worker.controller.legacy.js
 * and re-exported from the slim controller.
 */

import { workersDal } from '../../dal/workers.dal.js';
import { buildWhere, ORDER_BY } from './worker.filters.js';
import { hydrate } from './worker.hydrator.js';
import { mapList } from './worker.mapper.js';
import { SqlParams } from '../../shared/db/sql-builder.js';

/**
 * List workers with pagination and optional filters.
 * Returns same shape as original getWorkers: { data, total, page, limit }.
 *
 * Query count: 3 (COUNT + list SELECT + user batch for creator/modifier)
 * COUNT and list SELECT run in parallel via Promise.all.
 *
 * @param {{ factory_id?: string|number, search?: string }} filters
 * @param {{ page?: number|string, limit?: number|string }} pagination
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
async function getWorkers({ factory_id, search = '' } = {}, { page = 1, limit = 10 } = {}) {
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const offset = (pageInt - 1) * limitInt;

  const params = new SqlParams();
  const where = buildWhere({ factory_id, search }, params);

  const [total, rows] = await Promise.all([
    workersDal.count(where.toString(), params.values),
    workersDal.findList(where.toString(), ORDER_BY, limitInt, offset, params.values),
  ]);

  await hydrate(rows);

  return {
    data: mapList(rows),
    total,
    page: pageInt,
    limit: limitInt,
  };
}

export const workerService = {
  getWorkers,
};
