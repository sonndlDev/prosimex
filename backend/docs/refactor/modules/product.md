# Product Module Refactor

## Status
Step 4 done (verify pending DB)

## Files Created

| File | Role |
|------|------|
| `src/modules/product/__legacy__/product.controller.legacy.js` | Exact copy of original; fixed import paths (`../../../`) |
| `src/dal/product_groups.dal.js` | `findByIds(ids)` — new DAL for product_groups table; supports hydration |
| `src/dal/products.dal.js` | `count()` + `findList()` — both preserve LEFT JOIN product_groups for WHERE parity |
| `src/modules/product/product.filters.js` | `buildWhere()` + `ORDER_BY` constant |
| `src/modules/product/product.hydrator.js` | Parallel batch-attaches `_product_group` (productGroupsDal) + `_creator`/`_modifier` (usersDal) |
| `src/modules/product/product.mapper.js` | Derives `product_group_name`, `creator_name`, `modifier_name`; strips internal keys |
| `src/modules/product/product.service.js` | Orchestrates `Promise.all([count, findList])`, then hydrate + map |
| `src/modules/product/product.controller.js` | Slim HTTP adapter; forwards `factory_id` + `search` filters; re-exports mutations from legacy |

## DAL Changes

- **`src/dal/product_groups.dal.js`**: new DAL created with `findByIds(ids)` method (`SELECT id, name FROM product_groups WHERE id = ANY($1::int[])`) to support product hydration

## SQL Patterns Observed

- **Pagination**: yes — `LIMIT $n OFFSET $n`, standard `{ data, total, page, limit }` envelope
- **Filters**: `factory_id` (exact match `p.factory_id = $n`) + `search` (OR across `p.name ILIKE` and `pg.name ILIKE`; same `$n` reused in original — SqlParams handles with two `?` placeholders)
- **COUNT query**: original includes `LEFT JOIN product_groups pg ON p.product_group_id = pg.id` because search can filter on `pg.name ILIKE` — preserved in DAL for exact parity
- **findList query**: also retains LEFT JOIN product_groups (same WHERE clause requires pg alias); `pg.name` column excluded from SELECT — hydrated separately via productGroupsDal batch
- **product_group_name**: `pg.name AS product_group_name` — removed from DAL list SELECT; hydrated via `productGroupsDal.findByIds` batch (parallel with users batch)
- **Users JOIN**: `LEFT JOIN users cu + mu` — removed from DAL query; hydrated via `usersDal.findByIds` batch
- **Alias**: "p" for products, "pg" for product_groups throughout WHERE and ORDER BY clauses
- **ORDER BY**: `p.created_at DESC` (single-column, matches original)
- **No json_agg**: no aggregated subqueries — straightforward JOIN-based hydration
- **Mutations**: `createProduct` (duplicate name check, audit), `updateProduct` (duplicate name check, COALESCE partial update, audit), `deleteProduct` (transaction + cascade + audit) — all in legacy unchanged
