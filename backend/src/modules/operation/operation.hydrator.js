/**
 * @file operation.hydrator.js
 * Attaches related user data (creator and modifier) to operation rows.
 * Runs a single batch query for all unique user IDs across both FK fields.
 *
 * Matches original LEFT JOIN behaviour:
 *   LEFT JOIN users cu ON o.created_by = cu.id
 *   LEFT JOIN users mu ON o.modified_by = mu.id
 * (no deleted_at filter on users)
 *
 * Note: product_groups are already aggregated in the DAL query (json_agg),
 * so no additional hydration is needed for that field.
 *
 * @param {object[]} items - operation rows from DAL
 * @returns {Promise<object[]>}
 */

import { attachOne } from '../../shared/batch/batch.js';
import { usersDal } from '../../dal/users.dal.js';

export async function hydrate(items) {
  if (!items.length) return items;

  await attachOne(items, {
    fields: ['created_by', 'modified_by'],
    as: ['_creator', '_modifier'],
    load: (ids) => usersDal.findByIds(ids),
    key: 'id',
  });

  return items;
}
