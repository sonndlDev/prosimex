/**
 * @file worker.mapper.js
 * Maps hydrated worker DAL rows to the API response shape.
 * Preserves exact key names, types, and ordering from original controller.
 *
 * Original SELECT shape:
 *   w.* (all columns)
 *   COALESCE(cu.full_name, cu.username) AS creator_name
 *   COALESCE(mu.full_name, mu.username) AS modifier_name
 *
 * Note: the original does NOT return factory_name — only factory_id (already
 * present on the worker row). The hydrator therefore only fetches users.
 */

/**
 * Map a single hydrated worker row to the response shape.
 * Derives creator_name, modifier_name from hydrated objects.
 * Removes internal hydrator keys (_creator, _modifier).
 *
 * @param {object} row - hydrated worker row
 * @returns {object}
 */
export function mapWorker(row) {
  const creator = row._creator;
  const modifier = row._modifier;

  // Replicate: COALESCE(cu.full_name, cu.username)
  const creator_name = creator
    ? (creator.full_name || creator.username || null)
    : null;

  // Replicate: COALESCE(mu.full_name, mu.username)
  const modifier_name = modifier
    ? (modifier.full_name || modifier.username || null)
    : null;

  const { _creator, _modifier, ...rest } = row;

  return {
    ...rest,
    creator_name,
    modifier_name,
  };
}

/**
 * Map an array of hydrated worker rows.
 * @param {object[]} rows
 * @returns {object[]}
 */
export function mapList(rows) {
  return rows.map(mapWorker);
}
