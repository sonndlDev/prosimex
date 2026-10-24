/**
 * @file customer.mapper.js
 * Maps hydrated customer DAL rows to the API response shape.
 * Preserves exact key names, types, and ordering from original controller.
 *
 * Original SELECT shape:
 *   c.* (all columns)
 *   c.address AS contact_info
 *   COALESCE(cu.full_name, cu.username) AS creator_name
 *   COALESCE(mu.full_name, mu.username) AS modifier_name
 */

/**
 * Map a single hydrated customer row to the response shape.
 * Applies COALESCE logic for creator_name/modifier_name.
 * Removes internal hydrator keys (_creator, _modifier).
 *
 * @param {object} row - hydrated customer row
 * @returns {object}
 */
export function mapCustomer(row) {
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

  // Spread all DAL columns (includes contact_info alias already), then add
  // the two computed display fields and remove the internal hydrator keys.
  const { _creator, _modifier, ...rest } = row;

  return {
    ...rest,
    creator_name,
    modifier_name,
  };
}

/**
 * Map an array of hydrated customer rows.
 * @param {object[]} rows
 * @returns {object[]}
 */
export function mapList(rows) {
  return rows.map(mapCustomer);
}
