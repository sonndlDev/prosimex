# Delete-Impact Module Refactor

## Status
Step 4 done (verify pending DB)

## Files Created

| File | Role |
|------|------|
| `src/modules/delete-impact/__legacy__/delete-impact.controller.legacy.js` | Exact copy of original; fixed import paths (`../../../`) |
| `src/modules/delete-impact/delete-impact.controller.js` | Slim re-export wrapper — all handlers forwarded from legacy |

## Endpoint Classification

| Endpoint | Type | Notes |
|----------|------|-------|
| `GET /:entity/:id` | Utility passthrough | Auth check + delegate to `delete-impact.util.js`; no new service needed |
| `POST /bulk` | Utility passthrough | Validates `ids` array + delegate to `delete-impact.util.js` |

## Classification Rationale

The controller contains no SQL of its own. All data access lives in `src/utils/delete-impact.util.js` which is a standalone, already-tested utility. The controller's only responsibilities are:
1. Validate `entity` against `DELETE_IMPACT_ENTITY_TYPES`
2. Check RBAC permission via `canViewImpact()` / `normalizePermissions()`
3. Delegate to `getDeleteImpact()` / `getBulkDeleteImpact()`

Creating a service layer that merely calls the util would add indirection with no benefit. Per SPEC rule 7 (simple passthrough utility → move to `__legacy__`, re-export everything), the slim controller is a pure re-export.

## No New DAL

`delete-impact.util.js` calls `pool.query()` directly with entity-specific SQL — it is not a candidate for the DAL registry (no single table, purpose-built utility). No DAL created.

## SQL Patterns Observed (in util, not controller)

- Each entity getter runs a lookup (`SELECT id, name FROM <table>`) then parallel `Promise.all` COUNT queries across related tables
- `getBulkDeleteImpact` loops sequentially over IDs (avoids N×M parallel blast), then merges via `mergeImpacts()`
- Response shape: `{ entityType, entityName, total, items, summary, hasImpact }`
