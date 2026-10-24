/**
 * @file supplier.service.js
 * Business logic for the supplier module — read path only.
 * Mutations (create/update/delete) are preserved in __legacy__/supplier.controller.legacy.js
 * and re-exported from the slim controller.
 */

import { suppliersDal } from '../../dal/suppliers.dal.js';
import { buildWhere, ORDER_BY } from './supplier.filters.js';
import { hydrate } from './supplier.hydrator.js';
import { mapList } from './supplier.mapper.js';
import { SqlParams } from '../../shared/db/sql-builder.js';

/**
 * List suppliers with optional search.
 * Returns same shape as original getSuppliers: a flat array (no pagination envelope).
 *
 * Original response: res.json(result.rows)  — plain array, no { data, total } wrapper.
 *
 * Query count: 1 (list SELECT only — no pagination, no user batch needed)
 *
 * @param {{ search?: string }} filters
 * @returns {Promise<object[]>}
 */
async function getSuppliers({ search = '' } = {}) {
  const params = new SqlParams();
  const where = buildWhere({ search }, params);

  const rows = await suppliersDal.findList(where.toString(), ORDER_BY, params.values);

  await hydrate(rows);

  return mapList(rows);
}

export const supplierService = {
  getSuppliers,
};
