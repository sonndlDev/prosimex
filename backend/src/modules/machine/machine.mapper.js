/**
 * @file machine.mapper.js
 * Maps hydrated machine DAL rows to the API response shape.
 * Preserves exact key names, types, and ordering from original controller.
 *
 * Original SELECT shape:
 *   m.* (all columns)
 *   f.name AS factory_name
 *   COALESCE(cu.full_name, cu.username) AS creator_name
 *   COALESCE(mu.full_name, mu.username) AS modifier_name
 */

/**
 * Map a single hydrated machine row to the response shape.
 * Derives factory_name, creator_name, modifier_name from hydrated objects.
 * Removes internal hydrator keys (_factory, _creator, _modifier).
 *
 * @param {object} row - hydrated machine row
 * @returns {object}
 */
export function mapMachine(row) {
  const factory = row._factory;
  const creator = row._creator;
  const modifier = row._modifier;

  // Replicate: f.name AS factory_name
  const factory_name = factory ? (factory.name ?? null) : null;

  // Replicate: COALESCE(cu.full_name, cu.username)
  const creator_name = creator
    ? (creator.full_name || creator.username || null)
    : null;

  // Replicate: COALESCE(mu.full_name, mu.username)
  const modifier_name = modifier
    ? (modifier.full_name || modifier.username || null)
    : null;

  const { _factory, _creator, _modifier, ...rest } = row;

  return {
    ...rest,
    factory_name,
    creator_name,
    modifier_name,
  };
}

/**
 * Map an array of hydrated machine rows.
 * @param {object[]} rows
 * @returns {object[]}
 */
export function mapList(rows) {
  return rows.map(mapMachine);
}
