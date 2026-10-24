/**
 * @file operation.filters.js
 * Builds the WHERE clause for operation list/count queries.
 * Used by operationService to ensure count and list use identical filters.
 *
 * Table alias "o" is used throughout to match original controller SQL.
 */

import { SqlParams, Where } from '../../shared/db/sql-builder.js';

/** ORDER BY clause — matches original "ORDER BY o.created_at DESC" semantics. */
export const ORDER_BY = 'ORDER BY o.created_at DESC';

/**
 * Build a WHERE clause for the operations list/count query.
 * Replicates exact filter logic from original getOperations controller.
 *
 * Original logic:
 *   WHERE o.deleted_at IS NULL
 *   [ AND (o.name ILIKE $n
 *          OR EXISTS (SELECT 1 FROM product_group_operations pgo_s
 *                     JOIN product_groups pg_s ON pgo_s.product_group_id = pg_s.id
 *                     WHERE pgo_s.operation_id = o.id
 *                       AND pg_s.name ILIKE $n
 *                       AND pg_s.deleted_at IS NULL
 *                       AND pgo_s.deleted_at IS NULL)) ]  -- when search non-empty
 *
 * Note: original reuses the same $n placeholder for both ILIKE conditions
 * (one value pushed once). SqlParams assigns each ? a fresh $n, so we add
 * the search value twice — once per ? — to match the original semantics.
 *
 * @param {{ search?: string }} filters
 * @param {SqlParams} [params] - shared params instance; create new if not passed
 * @returns {Where}
 */
export function buildWhere(filters, params = new SqlParams()) {
  const { search = '' } = filters;
  const w = new Where(params).and('o.deleted_at IS NULL');

  if (search) {
    const pattern = `%${search}%`;
    w.andAny(sub =>
      sub
        .or('o.name ILIKE ?', pattern)
        .or(
          `EXISTS (
            SELECT 1 FROM product_group_operations pgo_s
            JOIN product_groups pg_s ON pgo_s.product_group_id = pg_s.id
            WHERE pgo_s.operation_id = o.id
              AND pg_s.name ILIKE ?
              AND pg_s.deleted_at IS NULL
              AND pgo_s.deleted_at IS NULL
          )`,
          pattern,
        ),
    );
  }

  return w;
}
