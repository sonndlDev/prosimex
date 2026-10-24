/**
 * @file product.service.js
 * Business logic for the product module — read path only.
 * Mutations (create/update/delete) are preserved in __legacy__/product.controller.legacy.js
 * and re-exported from the slim controller.
 */

import { productsDal } from '../../dal/products.dal.js';
import { buildWhere, ORDER_BY } from './product.filters.js';
import { hydrate } from './product.hydrator.js';
import { mapList } from './product.mapper.js';
import { SqlParams } from '../../shared/db/sql-builder.js';

/**
 * List products with pagination and optional filters.
 * Returns same shape as original getProducts: { data, total, page, limit }.
 *
 * Query count: 4 (COUNT + list SELECT + product_group batch + user batch;
 *               product_group and user batches run in parallel via Promise.all in hydrator)
 * COUNT and list SELECT run in parallel via Promise.all.
 *
 * @param {{ factory_id?: string|number, search?: string }} filters
 * @param {{ page?: number|string, limit?: number|string }} pagination
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
async function getProducts({ factory_id, search = '' } = {}, { page = 1, limit = 10 } = {}) {
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const offset = (pageInt - 1) * limitInt;

  const params = new SqlParams();
  const where = buildWhere({ factory_id, search }, params);

  const [total, rows] = await Promise.all([
    productsDal.count(where.toString(), params.values),
    productsDal.findList(where.toString(), ORDER_BY, limitInt, offset, params.values),
  ]);

  await hydrate(rows);

  return {
    data: mapList(rows),
    total,
    page: pageInt,
    limit: limitInt,
  };
}

export const productService = {
  getProducts,
};
