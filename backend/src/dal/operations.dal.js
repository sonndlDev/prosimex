/**
 * @file operations.dal.js
 * Data Access Layer for the `operations` table.
 * One DAL per table — do not create a second DAL for operations.
 *
 * Special note: the list query includes json_agg for product_groups because
 * the aggregation requires a GROUP BY that is intrinsic to the SQL shape.
 * User hydration (creator_name/modifier_name) is done separately via
 * operation.hydrator.js + usersDal.findByIds.
 */

import { db } from '../shared/db/index.js';

/**
 * Count operations matching a WHERE clause built by buildWhere.
 * The WHERE clause uses alias "o" for the operations table.
 *
 * @param {string} whereStr - e.g. "WHERE o.deleted_at IS NULL AND ..."
 * @param {any[]} params - positional parameters
 * @param {object} [client] - optional pg client for transactions
 * @returns {Promise<number>}
 */
async function count(whereStr, params, client = db) {
  const sql = `SELECT COUNT(*) FROM operations o ${whereStr}`;
  const { rows } = await client.query(sql, params);
  return parseInt(rows[0].count);
}

/**
 * List operations matching a WHERE clause with pagination.
 * Includes json_agg for product_groups (intrinsic to query shape).
 * creator_name/modifier_name are NOT included — hydrated separately.
 *
 * @param {string} whereStr - uses alias "o" for operations
 * @param {string} orderBy - e.g. "ORDER BY o.created_at DESC"
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
    SELECT
      o.*,
      COALESCE(json_agg(DISTINCT pg.name) FILTER (WHERE pg.name IS NOT NULL), '[]') AS product_groups
    FROM operations o
    LEFT JOIN product_group_operations pgo ON o.id = pgo.operation_id AND pgo.deleted_at IS NULL
    LEFT JOIN product_groups pg ON pgo.product_group_id = pg.id AND pg.deleted_at IS NULL
    ${whereStr}
    GROUP BY o.id
    ${orderBy}
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
  `;
  const { rows } = await client.query(sql, [...params, limit, offset]);
  return rows;
}

export const operationsDal = {
  count,
  findList,
};
