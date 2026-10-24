/**
 * @file machines.dal.js
 * Data Access Layer for the `machines` table.
 * One DAL per table — do not create a second DAL for machines.
 *
 * The list query does NOT include LEFT JOIN users or factories for name columns.
 * Those are hydrated separately via machine.hydrator.js.
 *
 * The COUNT query preserves the original LEFT JOIN factories to maintain
 * exact parity with the original controller.
 */

import { db } from '../shared/db/index.js';

/**
 * Count machines matching a WHERE clause built by buildWhere.
 * Includes LEFT JOIN factories to match original controller COUNT query.
 * The WHERE clause uses alias "m" for the machines table.
 *
 * @param {string} whereStr - e.g. "WHERE m.deleted_at IS NULL AND ..."
 * @param {any[]} params - positional parameters
 * @param {object} [client] - optional pg client for transactions
 * @returns {Promise<number>}
 */
async function count(whereStr, params, client = db) {
  const sql = `
    SELECT COUNT(*)
    FROM machines m
    LEFT JOIN factories f ON m.factory_id = f.id
    ${whereStr}
  `;
  const { rows } = await client.query(sql, params);
  return parseInt(rows[0].count);
}

/**
 * List machines matching a WHERE clause with pagination.
 * Returns machines.* — factory_name/creator_name/modifier_name are hydrated separately.
 *
 * @param {string} whereStr - uses alias "m" for machines
 * @param {string} orderBy - e.g. "ORDER BY m.sort_order ASC, m.name ASC"
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
    SELECT m.*
    FROM machines m
    ${whereStr}
    ${orderBy}
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
  `;
  const { rows } = await client.query(sql, [...params, limit, offset]);
  return rows;
}

export const machinesDal = {
  count,
  findList,
};
