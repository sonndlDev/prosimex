/** Return unique non-null values from array. Keys normalized to String. */
export const uniq = (values) => [...new Set(values.filter(v => v != null).map(String))];

/** Map rows by a key field. Key normalized to String(row[key]). */
export const keyBy = (rows, key) => new Map(rows.map(r => [String(r[key]), r]));

/** Group rows by a key field. Keys normalized to String. Preserves order. */
export function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const k = String(row[key]);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(row);
  }
  return map;
}

/** Create a composite string key from multiple values. */
export const compositeKey = (...values) => values.map(String).join('|');

/**
 * Call load() in chunks of `size` keys, concat results.
 * Only use when keys > 10,000 to avoid heavy queries.
 */
export async function chunked(keys, size, load) {
  const results = [];
  for (let i = 0; i < keys.length; i += size) {
    const chunk = keys.slice(i, i + size);
    const rows = await load(chunk);
    results.push(...rows);
  }
  return results;
}

/**
 * Attach n-1 / 1-1 related data to items.
 * @param {object[]} items - Items to hydrate
 * @param {object} opts
 * @param {string|string[]} opts.fields - Foreign key field(s) on item
 * @param {string|string[]} opts.as - Property name(s) to set on item
 * @param {function} opts.load - async (ids) => rows
 * @param {string} [opts.key='id'] - Primary key field on related rows
 */
export async function attachOne(items, { fields, as, load, key = 'id' }) {
  if (!items.length) return items;
  const fieldArr = Array.isArray(fields) ? fields : [fields];
  const asArr = Array.isArray(as) ? as : [as];

  const ids = uniq(items.flatMap(item => fieldArr.map(f => item[f]).filter(v => v != null)));
  const map = ids.length > 0 ? keyBy(await load(ids), key) : new Map();

  for (const item of items) {
    for (let i = 0; i < fieldArr.length; i++) {
      item[asArr[i]] = item[fieldArr[i]] != null ? (map.get(String(item[fieldArr[i]])) ?? null) : null;
    }
  }
  return items;
}

/**
 * Attach 1-n related data to items.
 * @param {object[]} items - Items to hydrate
 * @param {object} opts
 * @param {string} [opts.field='id'] - Primary key field on items
 * @param {string} opts.as - Property name to set on item
 * @param {function} opts.load - async (ids) => rows
 * @param {string} opts.foreignKey - FK field on related rows pointing to items
 */
export async function attachMany(items, { field = 'id', as, load, foreignKey }) {
  if (!items.length) return items;
  const ids = uniq(items.map(item => item[field]).filter(v => v != null));
  const rows = ids.length > 0 ? await load(ids) : [];
  const map = groupBy(rows, foreignKey);

  for (const item of items) {
    item[as] = map.get(String(item[field])) ?? [];
  }
  return items;
}
