/**
 * @file factory.hydrator.js
 * Attaches related user data (creator and modifier) to factory rows.
 * Runs a single batch query for all unique user IDs across both FK fields.
 */

import { attachOne } from '../../shared/batch/batch.js';
import { usersDal } from '../../dal/users.dal.js';

/**
 * Hydrate factory rows with creator and modifier user objects.
 * Sets `item._creator` and `item._modifier` on each row.
 * These internal keys are consumed by the mapper and not exposed in responses.
 *
 * Matches original LEFT JOIN behaviour:
 *   LEFT JOIN users cu ON factories.created_by = cu.id
 *   LEFT JOIN users mu ON factories.modified_by = mu.id
 * (no deleted_at filter on users)
 *
 * @param {object[]} items - factory rows from DAL
 * @returns {Promise<object[]>}
 */
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
