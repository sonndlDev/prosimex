/**
 * @file customer.filters.js
 * Builds the WHERE clause for customer list/count queries.
 * Used by customerService to ensure count and list use identical filters.
 */

import { SqlParams, Where } from '../../shared/db/sql-builder.js';

/** ORDER BY clause — matches original "ORDER BY created_at DESC" semantics. */
export const ORDER_BY = 'ORDER BY c.created_at DESC';

/**
 * Build a WHERE clause for the customers list/count query.
 * Replicates exact filter logic from original getCustomers controller.
 *
 * Original logic:
 *   WHERE deleted_at IS NULL
 *   [ AND (name ILIKE $n OR code ILIKE $n) ]   -- when search is non-empty
 *
 * @param {{ search?: string }} filters
 * @param {SqlParams} [params] - shared params instance; create new if not passed
 * @returns {Where}
 */
export function buildWhere(filters, params = new SqlParams()) {
  const { search = '' } = filters;
  const w = new Where(params).and('c.deleted_at IS NULL');

  if (search) {
    w.andAny(sub =>
      sub
        .or('c.name ILIKE ?', `%${search}%`)
        .or('c.code ILIKE ?', `%${search}%`),
    );
  }

  return w;
}
