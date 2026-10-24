/**
 * @file supplier.mapper.js
 * Maps supplier DAL rows to the API response shape.
 *
 * Original SELECT shape:
 *   SELECT * FROM suppliers ...
 *
 * No JOIN-derived fields (creator_name/modifier_name are NOT in the original query),
 * so the mapper is a pass-through — rows are returned as-is.
 */

/**
 * Map a single supplier row to the response shape.
 * Pass-through — no computed fields needed.
 *
 * @param {object} row - supplier row from DAL
 * @returns {object}
 */
export function mapSupplier(row) {
  return row;
}

/**
 * Map an array of supplier rows.
 * @param {object[]} rows
 * @returns {object[]}
 */
export function mapList(rows) {
  return rows.map(mapSupplier);
}
