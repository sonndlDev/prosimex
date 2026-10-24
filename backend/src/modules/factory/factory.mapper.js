/**
 * @file factory.mapper.js
 * Maps hydrated factory DAL rows to the API response shape.
 * Preserves exact key names, types, and ordering from original controller.
 *
 * Original SELECT shape:
 *   factories.* (all columns)
 *   COALESCE(cu.full_name, cu.username) AS creator_name
 *   COALESCE(mu.full_name, mu.username) AS modifier_name
 */

/**
 * Map a single hydrated factory row to the response shape.
 * Applies COALESCE logic for creator_name/modifier_name.
 * Removes internal hydrator keys (_creator, _modifier).
 *
 * @param {object} row - hydrated factory row
 * @returns {object}
 */
export function mapFactory(row) {
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
 * Map an array of hydrated factory rows.
 * @param {object[]} rows
 * @returns {object[]}
 */
export function mapList(rows) {
  return rows.map(mapFactory);
}
