/**
 * @file factory.filters.js
 * Builds the WHERE clause for factory list/count queries.
 * Used by factoryService to ensure count and list use identical filters.
 */

import { SqlParams, Where } from '../../shared/db/sql-builder.js';

/** ORDER BY clause — matches original "ORDER BY factories.created_at DESC" semantics. */
export const ORDER_BY = 'ORDER BY factories.created_at DESC';

/**
 * Build a WHERE clause for the factories list/count query.
 * Replicates exact filter logic from original getFactories controller.
 *
 * Original logic:
 *   WHERE factories.deleted_at IS NULL
 *   [ AND (factories.name ILIKE $n OR factories.location ILIKE $n) ]  -- when search is non-empty
 *
 * @param {{ search?: string }} filters
 * @param {SqlParams} [params] - shared params instance; create new if not passed
 * @returns {Where}
 */
export function buildWhere(filters, params = new SqlParams()) {
  const { search = '' } = filters;
  const w = new Where(params).and('factories.deleted_at IS NULL');

  if (search) {
    w.andAny(sub =>
      sub
        .or('factories.name ILIKE ?', `%${search}%`)
        .or('factories.location ILIKE ?', `%${search}%`),
    );
  }

  return w;
}
