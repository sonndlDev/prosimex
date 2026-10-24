/**
 * @file product.hydrator.js
 * Attaches related product_group and user data to product rows.
 * Runs two batch queries in parallel: one for product_groups, one for users.
 *
 * Matches original LEFT JOIN behaviour:
 *   LEFT JOIN product_groups pg ON p.product_group_id = pg.id
 *   LEFT JOIN users cu ON p.created_by = cu.id
 *   LEFT JOIN users mu ON p.modified_by = mu.id
 * (no deleted_at filter on product_groups or users)
 *
 * @param {object[]} items - product rows from DAL
 * @returns {Promise<object[]>}
 */

import { attachOne } from '../../shared/batch/batch.js';
import { usersDal } from '../../dal/users.dal.js';
import { productGroupsDal } from '../../dal/product_groups.dal.js';

export async function hydrate(items) {
  if (!items.length) return items;

  await Promise.all([
    attachOne(items, {
      fields: ['product_group_id'],
      as: ['_product_group'],
      load: (ids) => productGroupsDal.findByIds(ids),
      key: 'id',
    }),
    attachOne(items, {
      fields: ['created_by', 'modified_by'],
      as: ['_creator', '_modifier'],
      load: (ids) => usersDal.findByIds(ids),
      key: 'id',
    }),
  ]);

  return items;
}
