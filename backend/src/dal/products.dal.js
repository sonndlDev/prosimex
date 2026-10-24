/**
 * @file products.dal.js
 * Data Access Layer for the `products` table.
 * One DAL per table — do not create a second DAL for products.
 *
 * The list query does NOT include LEFT JOIN users or product_groups for name columns.
 * Those are hydrated separately via product.hydrator.js.
 *
 * The COUNT query preserves the original LEFT JOIN product_groups to maintain
 * exact parity with the original controller, which filters on pg.name ILIKE.
 * The WHERE clause uses alias "p" for products and "pg" for product_groups.
 */

import { db } from '../shared/db/index.js';

/**
 * Count products matching a WHERE clause built by buildWhere.
 * Includes LEFT JOIN product_groups to match original controller COUNT query
 * (which may filter on pg.name ILIKE via the search parameter).
 *
 * @param {string} whereStr - e.g. "WHERE p.deleted_at IS NULL AND ..."
 * @param {any[]} params - positional parameters
 * @param {object} [client] - optional pg client for transactions
 * @returns {Promise<number>}
 */
async function count(whereStr, params, client = db) {
  const sql = `
    SELECT COUNT(*)
    FROM products p
    LEFT JOIN product_groups pg ON p.product_group_id = pg.id
    ${whereStr}
  `;
  const { rows } = await client.query(sql, params);
  return parseInt(rows[0].count);
}

/**
 * List products matching a WHERE clause with pagination.
 * Returns products.* via alias "p" — product_group_name/creator_name/modifier_name
 * are hydrated separately.
 *
 * Note: the WHERE clause still uses "pg" alias for the search condition on
 * product_group name. To keep WHERE parity with COUNT, findList also includes
 * the LEFT JOIN product_groups — the name column is excluded from SELECT
 * (hydrated separately).
 *
 * @param {string} whereStr - uses aliases "p" and "pg"
 * @param {string} orderBy - e.g. "ORDER BY p.created_at DESC"
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
    SELECT p.*
    FROM products p
    LEFT JOIN product_groups pg ON p.product_group_id = pg.id
    ${whereStr}
    ${orderBy}
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
  `;
  const { rows } = await client.query(sql, [...params, limit, offset]);
  return rows;
}

export const productsDal = {
  count,
  findList,
};
