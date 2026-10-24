/**
 * @file product_groups.dal.js
 * Data Access Layer for the `product_groups` table.
 * One DAL per table — do not create a second DAL for product_groups.
 *
 * Used by product.hydrator.js to batch-attach product_group_name to product rows,
 * replacing the original LEFT JOIN product_groups in the list query.
 */

import { db } from '../shared/db/index.js';

/**
 * Find product groups by an array of IDs.
 * No deleted_at filter — matches original LEFT JOIN behaviour.
 *
 * @param {number[]} ids
 * @param {object} [client]
 * @returns {Promise<object[]>}
 */
async function findByIds(ids, client = db) {
  if (!ids.length) return [];
  const { rows } = await client.query(
    'SELECT id, name FROM product_groups WHERE id = ANY($1::int[])',
    [ids],
  );
  return rows;
}

export const productGroupsDal = {
  findByIds,
};
