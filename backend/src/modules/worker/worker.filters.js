/**
 * @file worker.filters.js
 * Builds the WHERE clause for worker list/count queries.
 * Used by workerService to ensure count and list use identical filters.
 *
 * Table alias "w" is used throughout to match the refactored DAL queries.
 *
 * Original logic (from controller):
 *   WHERE deleted_at IS NULL                                            (count, no alias)
 *   WHERE w.deleted_at IS NULL                                          (list, with alias)
 *   [ AND factory_id = $n / w.factory_id = $n ]
 *   [ AND (name ILIKE $n OR code ILIKE $n) / (w.name ILIKE $n OR w.code ILIKE $n) ]
 *
 * Note: original reuses the same $n placeholder for both ILIKE conditions
 * (one value pushed once). SqlParams assigns each ? a fresh $n, so we add
 * the search value twice — once per ? — to match the original semantics.
 */

import { SqlParams, Where } from '../../shared/db/sql-builder.js';

/**
 * ORDER BY clause — matches original "ORDER BY w.created_at DESC".
 */
export const ORDER_BY = 'ORDER BY w.created_at DESC';

/**
 * Build a WHERE clause for the workers list/count query.
 * Replicates exact filter logic from original getWorkers controller.
 *
 * @param {{ factory_id?: string|number, search?: string }} filters
 * @param {SqlParams} [params] - shared params instance; create new if not passed
 * @returns {Where}
 */
export function buildWhere(filters, params = new SqlParams()) {
  const { factory_id, search = '' } = filters;
  const w = new Where(params).and('w.deleted_at IS NULL');

  if (factory_id) {
    w.and('w.factory_id = ?', factory_id);
  }

  if (search) {
    const pattern = `%${search}%`;
    w.andAny(sub =>
      sub
        .or('w.name ILIKE ?', pattern)
        .or('w.code ILIKE ?', pattern),
    );
  }

  return w;
}
