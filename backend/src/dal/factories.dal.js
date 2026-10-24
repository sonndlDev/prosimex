/**
 * @file factories.dal.js
 * Data Access Layer for the `factories` table.
 * One DAL per table — do not create a second DAL for factories.
 *
 * The list query does NOT include the LEFT JOIN users for creator/modifier names.
 * Those are hydrated separately via factory.hydrator.js + usersDal.findByIds.
 */

import { db } from '../shared/db/index.js';

/**
 * Count factories matching a WHERE clause built by buildWhere.
 * @param {string} whereStr - e.g. "WHERE factories.deleted_at IS NULL AND ..."
 * @param {any[]} params - positional parameters
 * @param {object} [client] - optional pg client for transactions
 * @returns {Promise<number>}
 */
async function count(whereStr, params, client = db) {
  const sql = `SELECT COUNT(*) FROM factories ${whereStr}`;
  const { rows } = await client.query(sql, params);
  return parseInt(rows[0].count);
}

/**
 * List factories matching a WHERE clause with pagination.
 * Returns factories.* — creator_name/modifier_name are hydrated separately.
 * @param {string} whereStr
 * @param {string} orderBy - e.g. "ORDER BY factories.created_at DESC"
 * @param {number} limit
 * @param {number} offset
 * @param {any[]} params - base params (LIMIT and OFFSET are appended)
 * @param {object} [client]
 * @returns {Promise<object[]>}
 */
async function findList(whereStr, orderBy, limit, offset, params, client = db) {
  const limitPlaceholder = `$${params.length + 1}`;
  const offsetPlaceholder = `$${params.length + 2}`;
  const sql = `
    SELECT factories.*
    FROM factories
    ${whereStr}
    ${orderBy}
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
  `;
  const { rows } = await client.query(sql, [...params, limit, offset]);
  return rows;
}

/**
 * Find factories by an array of IDs.
 * No deleted_at filter — matches original LEFT JOIN behaviour in machine queries.
 * @param {number[]} ids
 * @param {object} [client]
 * @returns {Promise<object[]>}
 */
async function findByIds(ids, client = db) {
  if (!ids.length) return [];
  const { rows } = await client.query(
    'SELECT id, name FROM factories WHERE id = ANY($1::int[])',
    [ids],
  );
  return rows;
}

export const factoriesDal = {
  count,
  findList,
  findByIds,
};
