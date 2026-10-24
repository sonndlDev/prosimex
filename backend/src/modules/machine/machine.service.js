/**
 * @file machine.service.js
 * Business logic for the machine module — read path only.
 * Mutations (create/update/delete) are preserved in __legacy__/machine.controller.legacy.js
 * and re-exported from the slim controller.
 */

import { machinesDal } from '../../dal/machines.dal.js';
import { buildWhere, ORDER_BY } from './machine.filters.js';
import { hydrate } from './machine.hydrator.js';
import { mapList } from './machine.mapper.js';
import { SqlParams } from '../../shared/db/sql-builder.js';

/**
 * List machines with pagination and optional filters.
 * Returns same shape as original getMachines: { data, total, page, limit }.
 *
 * Query count: 4 (COUNT + list SELECT + factory batch + user batch;
 *               factory and user batches run in parallel via Promise.all in hydrator)
 *
 * @param {{ factory_id?: string|number, search?: string }} filters
 * @param {{ page?: number|string, limit?: number|string }} pagination
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
async function getMachines({ factory_id, search = '' } = {}, { page = 1, limit = 10 } = {}) {
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const offset = (pageInt - 1) * limitInt;

  const params = new SqlParams();
  const where = buildWhere({ factory_id, search }, params);

  const [total, rows] = await Promise.all([
    machinesDal.count(where.toString(), params.values),
    machinesDal.findList(where.toString(), ORDER_BY, limitInt, offset, params.values),
  ]);

  await hydrate(rows);

  return {
    data: mapList(rows),
    total,
    page: pageInt,
    limit: limitInt,
  };
}

export const machineService = {
  getMachines,
};
