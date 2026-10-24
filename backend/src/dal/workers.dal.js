/**
 * @file workers.dal.js
 * Data Access Layer for the `workers` table.
 * One DAL per table — do not create a second DAL for workers.
 *
 * The list query does NOT include the LEFT JOIN users for creator/modifier names.
 * Those are hydrated separately via worker.hydrator.js + usersDal.findByIds.
 *
 * The COUNT query uses the bare `workers` table (no alias) to match the original
 * controller which also uses no alias on the count query.
 */

import { db } from '../shared/db/index.js';

/**
 * Count workers matching a WHERE clause built by buildWhere.
 * Uses alias "w" for the workers table to match the list query WHERE clause.
 *
 * @param {string} whereStr - e.g. "WHERE w.deleted_at IS NULL AND ..."
 * @param {any[]} params - positional parameters
 * @param {object} [client] - optional pg client for transactions
 * @returns {Promise<number>}
 */
async function count(whereStr, params, client = db) {
  const sql = `SELECT COUNT(*) FROM workers w ${whereStr}`;
  const { rows } = await client.query(sql, params);
  return parseInt(rows[0].count);
}

/**
 * List workers matching a WHERE clause with pagination.
 * Returns workers.* via alias "w" — creator_name/modifier_name are hydrated separately.
 *
 * @param {string} whereStr - uses alias "w" for workers
 * @param {string} orderBy - e.g. "ORDER BY w.created_at DESC"
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
    SELECT w.*
    FROM workers w
    ${whereStr}
    ${orderBy}
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
  `;
  const { rows } = await client.query(sql, [...params, limit, offset]);
  return rows;
}

export const workersDal = {
  count,
  findList,
};
