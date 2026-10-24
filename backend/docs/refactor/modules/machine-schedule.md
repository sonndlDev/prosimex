# Machine-Schedule Module Refactor

## Status
Step 4 done (verify pending DB)

## Files Created

| File | Role |
|------|------|
| `src/modules/machine-schedule/__legacy__/machine-schedule.controller.legacy.js` | Exact copy of original; fixed import paths (`../../../`) |
| `src/modules/machine-schedule/machine-schedule.service.js` | Type C service — SQL kept inline; no DAL/hydrator/mapper |
| `src/modules/machine-schedule/machine-schedule.controller.js` | Slim adapter; validates required params; delegates to service |

## Endpoint Classification

| Endpoint | Type | Notes |
|----------|------|-------|
| `GET /calendar` | C (complex read) | Multi-JOIN, conditional SQL branches, no pagination, post-process on rows |

## SQL Patterns Observed

- **Two queries**: machines SELECT + production_plan_days events SELECT — run sequentially (machines result drives no branching on events query)
- **Conditional JOIN**: machines query uses `JOIN machines` in normal mode, `LEFT JOIN machines` in `unassignedMode` — SQL template literal switches via ternary
- **Conditional WHERE**: `pp.machine_id IS NULL` added only in unassigned mode; `factory_id` filter adds `$3` only when present
- **Dynamic param count**: `$3` for factory_id is position-dependent — `scheduleParams` array built imperatively; preserved exactly
- **unassigned mode**: machines list replaced with sentinel `[{ id: "unassigned", title: "CHƯA GÁN MÁY" }]`; resourceId hardcoded to `'unassigned'` in SELECT
- **Post-processing**: each event row has `start`/`end` rewritten from PG date to `${datePart}T07:00:00+07:00` / `T16:30:00+07:00`; `allDay: false`; `backgroundColor` derived from `color_status`
- **No pagination**: response is `{ machines: [...], events: [...] }` flat object
- **No mutations**: module is read-only; no legacy re-exports needed
- **console.error preserved**: "Schedule Error:" matches original for log grep consistency
