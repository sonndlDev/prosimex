# Worker Module Refactor

## Status
Step 4 done (verify pending DB)

## Files Created

| File | Role |
|------|------|
| `src/modules/worker/__legacy__/worker.controller.legacy.js` | Exact copy of original; fixed import paths (`../../../`) |
| `src/dal/workers.dal.js` | `count()` + `findList()` — both use alias "w" for workers table |
| `src/modules/worker/worker.filters.js` | `buildWhere()` + `ORDER_BY` constant |
| `src/modules/worker/worker.hydrator.js` | Batch-attaches `_creator`/`_modifier` (usersDal) — no factory hydration (original SELECT does not return factory_name) |
| `src/modules/worker/worker.mapper.js` | Derives `creator_name`, `modifier_name`; strips internal keys |
| `src/modules/worker/worker.service.js` | Orchestrates `Promise.all([count, findList])`, then hydrate + map |
| `src/modules/worker/worker.controller.js` | Slim HTTP adapter; forwards `factory_id` + `search` filters; re-exports mutations from legacy |

## SQL Patterns Observed

- **Pagination**: yes — `LIMIT $n OFFSET $n`, standard `{ data, total, page, limit }` envelope
- **Filters**: `factory_id` (exact match `w.factory_id = $n`) + `search` (OR across `w.name ILIKE` and `w.code ILIKE`; same `$n` reused in original — SqlParams handles with two `?` placeholders)
- **COUNT query**: original uses bare `workers` table with no alias and no alias in WHERE; refactored to `workers w` alias for consistency with findList WHERE clause
- **No factory_name**: original list SELECT does NOT include `factory_name` — only `factory_id` is returned on the row. Hydrator therefore only fetches users (no factory batch needed)
- **Users JOIN**: `LEFT JOIN users cu + mu` — removed from DAL query; hydrated via `usersDal.findByIds` single batch (creator + modifier IDs deduped together)
- **Alias**: "w" used throughout WHERE and ORDER BY clauses in refactored DAL
- **ORDER BY**: `w.created_at DESC` (single-column, matches original)
- **Mutations**: `createWorker` (unique constraint guard on code), `updateWorker` (COALESCE partial update + audit), `deleteWorker` (transaction + cascade + audit) — all in legacy unchanged
