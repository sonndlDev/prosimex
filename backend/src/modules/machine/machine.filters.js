/**
 * @file machine.filters.js
 * Builds the WHERE clause for machine list/count queries.
 * Used by machineService to ensure count and list use identical filters.
 *
 * Table alias "m" is used throughout to match original controller SQL.
 */

import { SqlParams, Where } from '../../shared/db/sql-builder.js';

/**
 * ORDER BY clause — matches original "ORDER BY m.sort_order ASC, m.name ASC" semantics.
 */
export const ORDER_BY = 'ORDER BY m.sort_order ASC, m.name ASC';

/**
 * Build a WHERE clause for the machines list/count query.
 * Replicates exact filter logic from original getMachines controller.
 *
 * Original logic:
 *   WHERE m.deleted_at IS NULL
 *   [ AND m.factory_id = $n ]              -- when factory_id is provided
 *   [ AND (m.name ILIKE $n OR m.code ILIKE $n) ]  -- when search is non-empty
 *
 * Note: original reuses the same $n placeholder for both ILIKE conditions
 * (one value pushed once). SqlParams assigns each ? a fresh $n, so we add
 * the search value twice — once per ? — to match the original semantics.
 *
 * @param {{ factory_id?: string|number, search?: string }} filters
 * @param {SqlParams} [params] - shared params instance; create new if not passed
 * @returns {Where}
 */
export function buildWhere(filters, params = new SqlParams()) {
  const { factory_id, search = '' } = filters;
  const w = new Where(params).and('m.deleted_at IS NULL');

  if (factory_id) {
    w.and('m.factory_id = ?', factory_id);
  }

  if (search) {
    const pattern = `%${search}%`;
    w.andAny(sub =>
      sub
        .or('m.name ILIKE ?', pattern)
        .or('m.code ILIKE ?', pattern),
    );
  }

  return w;
}
