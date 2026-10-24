/**
 * @file product-group.filters.js
 * Build dynamic WHERE clause for product_groups list query.
 */

/**
 * @param {{ factory_id?: string, search?: string }} filters
 * @returns {{ where: string, params: any[] }}
 */
export function buildWhere({ factory_id, search } = {}) {
  let where = 'WHERE pg.deleted_at IS NULL';
  const params = [];

  if (factory_id) {
    params.push(factory_id);
    where += ` AND pg.factory_id = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    where += ` AND pg.name ILIKE $${params.length}`;
  }

  return { where, params };
}

/**
 * Build WHERE for the simple COUNT query (no table alias).
 * Used by the count query that references product_groups directly.
 *
 * @param {{ factory_id?: string, search?: string }} filters
 * @returns {{ where: string, params: any[] }}
 */
export function buildWhereUnaliased({ factory_id, search } = {}) {
  let where = 'WHERE deleted_at IS NULL';
  const params = [];

  if (factory_id) {
    params.push(factory_id);
    where += ` AND factory_id = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    where += ` AND name ILIKE $${params.length}`;
  }

  return { where, params };
}
