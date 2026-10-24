/**
 * @file customer.service.js
 * Business logic for the customer module.
 * Delegates data access to customersDal; write operations preserved from original.
 */

import pool from '../../config/db.js';
import { customersDal } from '../../dal/customers.dal.js';
import { buildWhere, ORDER_BY } from './customer.filters.js';
import { hydrate } from './customer.hydrator.js';
import { mapList } from './customer.mapper.js';
import { SqlParams } from '../../shared/db/sql-builder.js';
import { cascadeOnCustomerDelete } from '../../utils/cascade-delete.util.js';

/**
 * List customers with pagination and optional search.
 * Returns same shape as original getCustomers: { data, total, page, limit }.
 *
 * Query count: 3 (COUNT + list SELECT + user batch)
 *
 * @param {{ search?: string }} filters
 * @param {{ page?: number|string, limit?: number|string }} pagination
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
async function getCustomers({ search = '' } = {}, { page = 1, limit = 10 } = {}) {
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const offset = (pageInt - 1) * limitInt;

  const params = new SqlParams();
  const where = buildWhere({ search }, params);

  const [total, rows] = await Promise.all([
    customersDal.count(where.toString(), params.values),
    customersDal.findList(where.toString(), ORDER_BY, limitInt, offset, params.values),
  ]);

  await hydrate(rows);

  return {
    data: mapList(rows),
    total,
    page: pageInt,
    limit: limitInt,
  };
}

/**
 * Create a new customer.
 * Preserves exact duplicate-check order and audit log from original controller.
 *
 * @param {{ code, name, address, phone, is_active, contact_info }} body
 * @param {number} userId
 * @returns {Promise<object>} - inserted customer row
 * @throws {{ code: '23505' }} on unique constraint violation
 * @throws {{ _dupName: true }} when name duplicate found
 * @throws {{ _dupCode: true }} when code duplicate found
 */
async function createCustomer(body, userId) {
  const { code, name, address, phone, is_active, contact_info } = body;
  const finalAddress = contact_info || address;

  if (name) {
    const existingName = await pool.query(
      'SELECT id FROM customers WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL',
      [name.trim()],
    );
    if (existingName.rowCount > 0) {
      const err = new Error('Tên khách hàng đã tồn tại trong hệ thống');
      err._dupName = true;
      throw err;
    }
  }

  if (code) {
    const existingCode = await pool.query(
      'SELECT id FROM customers WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL',
      [code.trim()],
    );
    if (existingCode.rowCount > 0) {
      const err = new Error('Mã khách hàng đã tồn tại trong hệ thống');
      err._dupCode = true;
      throw err;
    }
  }

  const newCustomer = await customersDal.insert(
    { code, name, address: finalAddress, phone, is_active, userId },
  );

  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
     VALUES ($1, 'CREATE', 'Customer', $2, $3)`,
    [userId, newCustomer.id, newCustomer],
  );

  return newCustomer;
}

/**
 * Update an existing customer.
 * Preserves exact duplicate-check order and audit log from original controller.
 *
 * @param {number|string} id
 * @param {{ code, name, address, phone, is_active, contact_info }} body
 * @param {number} userId
 * @returns {Promise<object>} - updated customer row
 * @throws {{ _notFound: true }} when customer not found
 * @throws {{ _dupName: true }} when name duplicate found
 * @throws {{ _dupCode: true }} when code duplicate found
 */
async function updateCustomer(id, body, userId) {
  const { code, name, address, phone, is_active, contact_info } = body;
  const finalAddress = contact_info || address;

  const beforeRes = await pool.query(
    'SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL',
    [id],
  );
  if (beforeRes.rowCount === 0) {
    const err = new Error('Customer not found');
    err._notFound = true;
    throw err;
  }

  if (name) {
    const existingName = await pool.query(
      'SELECT id FROM customers WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL AND id != $2',
      [name.trim(), id],
    );
    if (existingName.rowCount > 0) {
      const err = new Error('Tên khách hàng đã tồn tại trong hệ thống');
      err._dupName = true;
      throw err;
    }
  }

  if (code) {
    const existingCode = await pool.query(
      'SELECT id FROM customers WHERE LOWER(code) = LOWER($1) AND deleted_at IS NULL AND id != $2',
      [code.trim(), id],
    );
    if (existingCode.rowCount > 0) {
      const err = new Error('Mã khách hàng đã tồn tại trong hệ thống');
      err._dupCode = true;
      throw err;
    }
  }

  const updated = await customersDal.update(id, { code, name, address: finalAddress, phone, is_active, userId });
  if (!updated) {
    const err = new Error('Customer not found');
    err._notFound = true;
    throw err;
  }

  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
     VALUES ($1, 'UPDATE', 'Customer', $2, $3, $4)`,
    [userId, id, beforeRes.rows[0], updated],
  );

  return updated;
}

/**
 * Soft-delete a customer within a transaction, with cascade and audit log.
 * Preserves original transaction scope and step order.
 *
 * @param {number|string} id
 * @param {number} userId
 * @returns {Promise<void>}
 * @throws {{ _notFound: true }} when customer not found
 */
async function deleteCustomer(id, userId) {
  const client = await pool.connect();
  try {
    const beforeRes = await client.query(
      'SELECT * FROM customers WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    if (beforeRes.rowCount === 0) {
      const err = new Error('Customer not found');
      err._notFound = true;
      throw err;
    }

    await client.query('BEGIN');
    await cascadeOnCustomerDelete(client, id);
    await customersDal.softDelete(id, userId, client);
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data)
       VALUES ($1, 'DELETE', 'Customer', $2, $3)`,
      [userId, id, beforeRes.rows[0]],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export const customerService = {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
