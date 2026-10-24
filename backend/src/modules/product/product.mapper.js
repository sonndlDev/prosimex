/**
 * @file product.mapper.js
 * Maps hydrated product DAL rows to the API response shape.
 * Preserves exact key names, types, and ordering from original controller.
 *
 * Original SELECT shape:
 *   p.* (all columns)
 *   pg.name AS product_group_name
 *   COALESCE(cu.full_name, cu.username) AS creator_name
 *   COALESCE(mu.full_name, mu.username) AS modifier_name
 */

/**
 * Map a single hydrated product row to the response shape.
 * Derives product_group_name, creator_name, modifier_name from hydrated objects.
 * Removes internal hydrator keys (_product_group, _creator, _modifier).
 *
 * @param {object} row - hydrated product row
 * @returns {object}
 */
export function mapProduct(row) {
  const productGroup = row._product_group;
  const creator = row._creator;
  const modifier = row._modifier;

  // Replicate: pg.name AS product_group_name
  const product_group_name = productGroup ? (productGroup.name ?? null) : null;

  // Replicate: COALESCE(cu.full_name, cu.username)
  const creator_name = creator
    ? (creator.full_name || creator.username || null)
    : null;

  // Replicate: COALESCE(mu.full_name, mu.username)
  const modifier_name = modifier
    ? (modifier.full_name || modifier.username || null)
    : null;

  const { _product_group, _creator, _modifier, ...rest } = row;

  return {
    ...rest,
    product_group_name,
    creator_name,
    modifier_name,
  };
}

/**
 * Map an array of hydrated product rows.
 * @param {object[]} rows
 * @returns {object[]}
 */
export function mapList(rows) {
  return rows.map(mapProduct);
}
