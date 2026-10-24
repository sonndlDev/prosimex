# Operation Module Refactor

## Status
Step 4 done (verify pending DB)

## Files Created

| File | Role |
|------|------|
| `src/modules/operation/__legacy__/operation.controller.legacy.js` | Exact copy of original; fixed import paths (`../../../`) |
| `src/dal/operations.dal.js` | `count()` + `findList()` — includes `json_agg` for `product_groups` |
| `src/modules/operation/operation.filters.js` | `buildWhere()` + `ORDER_BY` constant |
| `src/modules/operation/operation.hydrator.js` | Batch-attaches `_creator` / `_modifier` via `usersDal.findByIds` |
| `src/modules/operation/operation.mapper.js` | Applies `COALESCE(full_name, username)` logic; strips internal keys |
| `src/modules/operation/operation.service.js` | Orchestrates `Promise.all([count, findList])`, then hydrate + map |
| `src/modules/operation/operation.controller.js` | Slim HTTP adapter; re-exports mutations from legacy |

## SQL Patterns Observed

- **Pagination**: yes — `LIMIT $n OFFSET $n`, standard `{ data, total, page, limit }` envelope
- **Search filter**: complex — `o.name ILIKE $n OR EXISTS(subquery into product_group_operations + product_groups)`; same `$n` reused for both ILIKE conditions in original (SqlParams handles by adding value twice via two `?` placeholders)
- **product_groups aggregation**: `json_agg(DISTINCT pg.name) FILTER (WHERE pg.name IS NOT NULL)` — retained in DAL `findList` query (requires `GROUP BY o.id`); not decomposed into a separate hydration step
- **Users JOIN**: `LEFT JOIN users cu ON o.created_by = cu.id` + `LEFT JOIN users mu ON o.modified_by = mu.id` — removed from DAL query; hydrated separately via `usersDal.findByIds` batch
- **Alias**: table alias `o` used throughout WHERE and ORDER BY clauses
- **ORDER BY**: `o.created_at DESC`
- **Mutations**: `createOperation` (name validation + audit), `updateOperation` (duplicate check, COALESCE update), `deleteOperation` (transaction + cascade + audit) — all in legacy unchanged
