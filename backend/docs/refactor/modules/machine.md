# Machine Module Refactor

## Status
Step 4 done (verify pending DB)

## Files Created

| File | Role |
|------|------|
| `src/modules/machine/__legacy__/machine.controller.legacy.js` | Exact copy of original; fixed import paths (`../../../`) |
| `src/dal/machines.dal.js` | `count()` + `findList()` — count preserves original LEFT JOIN factories |
| `src/modules/machine/machine.filters.js` | `buildWhere()` + `ORDER_BY` constant |
| `src/modules/machine/machine.hydrator.js` | Parallel batch-attaches `_factory` (factoriesDal) + `_creator`/`_modifier` (usersDal) |
| `src/modules/machine/machine.mapper.js` | Derives `factory_name`, `creator_name`, `modifier_name`; strips internal keys |
| `src/modules/machine/machine.service.js` | Orchestrates `Promise.all([count, findList])`, then hydrate + map |
| `src/modules/machine/machine.controller.js` | Slim HTTP adapter; forwards `factory_id` filter; re-exports mutations from legacy |

## DAL Changes

- **`src/dal/factories.dal.js`**: added `findByIds(ids)` method (SELECT id, name FROM factories WHERE id = ANY($1::int[])) to support machine hydration without creating a duplicate DAL

## SQL Patterns Observed

- **Pagination**: yes — `LIMIT $n OFFSET $n`, standard `{ data, total, page, limit }` envelope
- **Filters**: `factory_id` (exact match `m.factory_id = $n`) + `search` (OR across `m.name ILIKE` and `m.code ILIKE`; same `$n` reused in original — SqlParams handles with two `?` placeholders)
- **COUNT query**: original includes `LEFT JOIN factories f ON m.factory_id = f.id` — preserved in DAL for exact parity (factory_id filter is on `m` alias so the JOIN is technically redundant but kept as-is)
- **factory_name**: `f.name AS factory_name` — removed from DAL list query; hydrated separately via `factoriesDal.findByIds` batch (parallel with users batch)
- **Users JOIN**: `LEFT JOIN users cu + mu` — removed from DAL query; hydrated via `usersDal.findByIds` batch
- **Alias**: table alias `m` used throughout WHERE and ORDER BY clauses
- **ORDER BY**: `m.sort_order ASC, m.name ASC` (two-column sort — no `created_at`)
- **Mutations**: `createMachine` (unique constraint guard), `updateMachine` (full field replacement with audit; has `console.log` debug statements preserved), `deleteMachine` (transaction + cascade + audit) — all in legacy unchanged
