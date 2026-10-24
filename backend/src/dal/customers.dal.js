/**
 * @file customers.dal.js
 * Data Access Layer for the `customers` table.
 * One DAL per table — do not create a second DAL for customers.
 */

import { db } from '../shared/db/index.js';

// All columns returned by the original c.* SELECT (excluding JOIN-derived columns).
// Includes contact_info alias to preserve the original API response shape.
const SELECT_COLS = `
  c.id, c.code, c.name, c.address,
  c.address AS contact_info,
  c.phone, c.is_active,
  c.created_by, c.modified_by,
  c.created_at, c.updated_at, c.deleted_at, c.modified_time
`;

const SQL_FIND_BY_IDS = `
  SELECT ${SELECT_COLS}
  FROM customers c
  WHERE c.id = ANY($1::int[])
    AND c.deleted_at IS NULL
`;

/**
 * Count customers matching a WHERE clause built by buildWhere.
 * @param {string} whereStr - e.g. "WHERE c.deleted_at IS NULL AND ..."
 * @param {any[]} params - positional parameters
 * @param {object} [client] - optional pg client for transactions
 * @returns {Promise<number>}
 */
async function count(whereStr, params, client = db) {
  const sql = `SELECT COUNT(*) FROM customers c ${whereStr}`;
  const { rows } = await client.query(sql, params);
  return parseInt(rows[0].count);
}

/**
 * List customers matching a WHERE clause with pagination.
 * Returns all columns identical to the original `c.*` plus contact_info alias.
 * Does NOT include creator_name/modifier_name — those are hydrated separately.
 * @param {string} whereStr
 * @param {string} orderBy - e.g. "ORDER BY c.created_at DESC"
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
    SELECT ${SELECT_COLS}
    FROM customers c
    ${whereStr}
    ${orderBy}
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
  `;
  const { rows } = await client.query(sql, [...params, limit, offset]);
  return rows;
}

/**
 * Find customers by an array of IDs.
 * Filters deleted_at IS NULL (matching original LEFT JOIN behaviour — only active customers).
 * @param {number[]} ids
 * @param {object} [client]
 * @returns {Promise<object[]>}
 */
async function findByIds(ids, client = db) {
  if (!ids.length) return [];
  const { rows } = await client.query(SQL_FIND_BY_IDS, [ids]);
  return rows;
}

/**
 * Insert a new customer row.
 * @param {{ code, name, address, phone, is_active, userId }} data
 * @param {object} [client]
 * @returns {Promise<object>} - the inserted row
 */
async function insert(data, client = db) {
  const { code, name, address, phone, is_active, userId } = data;
  const { rows } = await client.query(
    `INSERT INTO customers (code, name, address, phone, is_active, created_by, modified_by)
     VALUES ($1, $2, $3, $4, COALESCE($5, true), $6, $6) RETURNING *`,
    [code, name, address, phone, is_active, userId],
  );
  return rows[0];
}

/**
 * Update a customer row (partial update — uses COALESCE to preserve existing values).
 * Also updates modified_time per original SQL.
 * @param {number|string} id
 * @param {{ code, name, address, phone, is_active, userId }} data
 * @param {object} [client]
 * @returns {Promise<object|null>} - updated row or null if not found / already deleted
 */
async function update(id, data, client = db) {
  const { code, name, address, phone, is_active, userId } = data;
  const { rows } = await client.query(
    `UPDATE customers
     SET code = COALESCE($1, code),
         name = COALESCE($2, name),
         address = COALESCE($3, address),
         phone = COALESCE($4, phone),
         is_active = COALESCE($5, is_active),
         updated_at = CURRENT_TIMESTAMP,
         modified_by = $7,
         modified_time = CURRENT_TIMESTAMP
     WHERE id = $6 AND deleted_at IS NULL
     RETURNING *`,
    [code, name, address, phone, is_active, id, userId],
  );
  return rows[0] || null;
}

/**
 * Soft-delete a customer (sets deleted_at and modified_time).
 * Does NOT cascade — caller is responsible for running cascadeOnCustomerDelete first.
 * @param {number|string} id
 * @param {number|string} userId
 * @param {object} [client]
 * @returns {Promise<object|null>} - { id } or null if not found
 */
async function softDelete(id, userId, client = db) {
  const { rows } = await client.query(
    `UPDATE customers
     SET deleted_at = CURRENT_TIMESTAMP,
         modified_by = $2,
         modified_time = CURRENT_TIMESTAMP
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [id, userId],
  );
  return rows[0] || null;
}

export const customersDal = {
  count,
  findList,
  findByIds,
  insert,
  update,
  softDelete,
};
