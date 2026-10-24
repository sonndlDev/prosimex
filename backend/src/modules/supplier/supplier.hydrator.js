/**
 * @file supplier.hydrator.js
 * No-op hydrator — the original getSuppliers controller does NOT JOIN the users
 * table, so no creator_name/modifier_name hydration is needed.
 *
 * Kept as a placeholder to maintain consistent module structure.
 *
 * @param {object[]} items - supplier rows from DAL
 * @returns {Promise<object[]>}
 */
export async function hydrate(items) {
  return items;
}
