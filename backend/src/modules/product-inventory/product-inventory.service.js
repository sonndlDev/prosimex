/**
 * @file product-inventory.service.js
 * Business logic for the product-inventory module — read path only.
 * Mutations are preserved in __legacy__/product-inventory.controller.legacy.js
 * and re-exported from the slim controller.
 *
 * getInventory — Type C:
 *   Paginated list with a correlated subquery (used_quantity) and dynamic
 *   multi-condition WHERE. No natural batch key for batch hydration.
 *   SQL base constants are in queries/inventory.sql.js; WHERE is built here.
 */

import { db } from '../../shared/db/index.js';
import {
  SQL_INVENTORY_COUNT_BASE,
  SQL_INVENTORY_DATA_BASE,
} from './queries/inventory.sql.js';

/**
 * Build the dynamic WHERE clause for the inventory list.
 *
 * @param {{ search?: string, inventory_type?: string, completed?: string }} filters
 * @returns {{ where: string, params: any[] }}
 */
function buildWhere({ search, inventory_type, completed } = {}) {
  // Dong xuat kho (co source_inventory_id) khong hien o bang chinh; xem qua getExportHistory
  let where = 'WHERE pi.deleted_at IS NULL AND pi.source_inventory_id IS NULL';
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    where += ` AND (p.name ILIKE $${params.length} OR o.name ILIKE $${params.length})`;
  }

  if (inventory_type && inventory_type !== 'ALL') {
    params.push(inventory_type);
    where += ` AND pi.inventory_type = $${params.length}`;
  }

  if (completed === 'true' || completed === '1') {
    where += ' AND pi.completed_at IS NOT NULL';
  } else if (completed === 'false' || completed === '0') {
    where += ' AND pi.completed_at IS NULL';
  }

  return { where, params };
}

/**
 * Fetch paginated product inventory records.
 *
 * @param {{ search?: string, inventory_type?: string, completed?: string }} filters
 * @param {{ page?: number|string, limit?: number|string }} pagination
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>}
 */
async function getInventory(filters = {}, { page = 1, limit = 10 } = {}) {
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || 10;
  const offsetInt = (pageInt - 1) * limitInt;

  const { where, params } = buildWhere(filters);

  const [countResult, result] = await Promise.all([
    db.query(`${SQL_INVENTORY_COUNT_BASE} ${where}`, params),
    db.query(
      `${SQL_INVENTORY_DATA_BASE} ${where} ORDER BY pi.recorded_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limitInt, offsetInt]
    ),
  ]);

  return {
    data: result.rows,
    total: parseInt(countResult.rows[0].count),
    page: pageInt,
    limit: limitInt,
  };
}

/**
 * Lich su xuat kho cua mot lo nhap.
 *
 * @param {number|string} inventoryId - ID cua lo nhap goc
 * @returns {Promise<object[]>}
 */
async function getExportHistory(inventoryId) {
  const result = await db.query(
    `SELECT
       e.id,
       e.quantity,
       e.note,
       e.completed_at as exported_at,
       COALESCE(u.full_name, u.username) as exporter_name
     FROM product_inventory e
     LEFT JOIN users u ON e.recorded_by = u.id
     WHERE e.source_inventory_id = $1
       AND e.deleted_at IS NULL
     ORDER BY e.completed_at DESC`,
    [inventoryId]
  );
  return result.rows;
}

export const productInventoryService = {
  getInventory,
  getExportHistory,
};
