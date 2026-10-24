/**
 * @file product.filters.js
 * Builds the WHERE clause for product list/count queries.
 * Used by productService to ensure count and list use identical filters.
 *
 * Table aliases: "p" for products, "pg" for product_groups.
 * The pg alias must be present in both COUNT and findList because
 * the search condition can filter on pg.name ILIKE.
 *
 * Original logic:
 *   WHERE p.deleted_at IS NULL
 *   [ AND p.factory_id = $n ]
 *   [ AND (p.name ILIKE $n OR pg.name ILIKE $n) ]
 *
 * Note: original reuses the same $n placeholder for both ILIKE conditions
 * (one value pushed once). SqlParams assigns each ? a fresh $n, so we add
 * the search value twice — once per ? — to match the original semantics.
 */

import { SqlParams, Where } from '../../shared/db/sql-builder.js';

/**
 * ORDER BY clause — matches original "ORDER BY p.created_at DESC".
 */
export const ORDER_BY = 'ORDER BY p.created_at DESC';

/**
 * Build a WHERE clause for the products list/count query.
 * Replicates exact filter logic from original getProducts controller.
 *
 * @param {{ factory_id?: string|number, search?: string }} filters
 * @param {SqlParams} [params] - shared params instance; create new if not passed
 * @returns {Where}
 */
export function buildWhere(filters, params = new SqlParams()) {
  const { factory_id, search = '' } = filters;
  const w = new Where(params).and('p.deleted_at IS NULL');

  if (factory_id) {
    w.and('p.factory_id = ?', factory_id);
  }

  if (search) {
    const pattern = `%${search}%`;
    w.andAny(sub =>
      sub
        .or('p.name ILIKE ?', pattern)
        .or('pg.name ILIKE ?', pattern),
    );
  }

  return w;
}
