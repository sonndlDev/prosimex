/**
 * @file worker.hydrator.js
 * Attaches related user data to worker rows.
 * Runs one batch query for users (creator + modifier).
 *
 * Matches original LEFT JOIN behaviour:
 *   LEFT JOIN users cu ON w.created_by = cu.id
 *   LEFT JOIN users mu ON w.modified_by = mu.id
 * (no deleted_at filter on users)
 *
 * Workers do NOT have a factory JOIN in the list query (factory_id is stored
 * on the worker row but factory_name is not returned by the original SELECT).
 *
 * @param {object[]} items - worker rows from DAL
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
