/**
 * @file suppliers.dal.js
 * Data Access Layer for the `suppliers` table.
 * One DAL per table — do not create a second DAL for suppliers.
 *
 * Note: the original getSuppliers controller returns a flat array (no pagination)
 * and does NOT JOIN the users table. No hydration needed for the list endpoint.
 */

import { db } from '../shared/db/index.js';

/**
 * List suppliers matching a WHERE clause.
 * Returns a flat array — original API returns result.rows directly (no pagination envelope).
 * @param {string} whereStr - e.g. "WHERE deleted_at IS NULL AND ..."
 * @param {string} orderBy - e.g. "ORDER BY id DESC"
 * @param {any[]} params - positional parameters
 * @param {object} [client] - optional pg client for transactions
 * @returns {Promise<object[]>}
 */
async function findList(whereStr, orderBy, params, client = db) {
  const sql = `SELECT * FROM suppliers ${whereStr} ${orderBy}`;
  const { rows } = await client.query(sql, params);
  return rows;
}

export const suppliersDal = {
  findList,
};
