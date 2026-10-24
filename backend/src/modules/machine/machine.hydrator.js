/**
 * @file machine.hydrator.js
 * Attaches related factory and user data to machine rows.
 * Runs two batch queries: one for factories, one for users.
 *
 * Matches original LEFT JOIN behaviour:
 *   LEFT JOIN factories f ON m.factory_id = f.id
 *   LEFT JOIN users cu ON m.created_by = cu.id
 *   LEFT JOIN users mu ON m.modified_by = mu.id
 * (no deleted_at filter on factories or users)
 *
 * @param {object[]} items - machine rows from DAL
 * @returns {Promise<object[]>}
 */

import { attachOne } from '../../shared/batch/batch.js';
import { usersDal } from '../../dal/users.dal.js';
import { factoriesDal } from '../../dal/factories.dal.js';

export async function hydrate(items) {
  if (!items.length) return items;

  await Promise.all([
    attachOne(items, {
      fields: ['factory_id'],
      as: ['_factory'],
      load: (ids) => factoriesDal.findByIds(ids),
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
