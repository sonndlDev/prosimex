/**
 * @file supplier.filters.js
 * Builds the WHERE clause for supplier list queries.
 * Used by supplierService to ensure consistent filtering.
 */

import { SqlParams, Where } from '../../shared/db/sql-builder.js';

/** ORDER BY clause — matches original "ORDER BY id DESC" semantics. */
export const ORDER_BY = 'ORDER BY id DESC';

/**
 * Build a WHERE clause for the suppliers list query.
 * Replicates exact filter logic from original getSuppliers controller.
 *
 * Original logic:
 *   WHERE deleted_at IS NULL
 *   [ AND (name ILIKE $1 OR code ILIKE $1) ]  -- when search is non-empty
 *
 * Note: original uses the same $1 placeholder for both ILIKE conditions
 * (single value pushed once). SqlParams handles this correctly — the same
 * value is added once and referenced by its position.
 *
 * @param {{ search?: string }} filters
 * @param {SqlParams} [params] - shared params instance; create new if not passed
 * @returns {Where}
 */
export function buildWhere(filters, params = new SqlParams()) {
  const { search = '' } = filters;
  const w = new Where(params).and('deleted_at IS NULL');

  if (search) {
    w.andAny(sub =>
      sub
        .or('name ILIKE ?', `%${search}%`)
        .or('code ILIKE ?', `%${search}%`),
    );
  }

  return w;
}
