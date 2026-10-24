# Module Refactor: dashboard

## Routes

| Method | Path | Handler | Classification |
|--------|------|---------|----------------|
| GET | /api/dashboard/metrics | getMetrics | Type C |
| GET | /api/dashboard/activities | getActivities | Type C |

## Classifications

### getMetrics — Type C (Aggregation report)
Ten parallel SQL queries covering orders, plans, machines, users, attendance, workers,
urgent orders, production progress, and recent activities. No natural batch key — all
queries are independent aggregations across different tables. Post-processing in JS
builds derived fields (statusMap, machineEfficiency, completion_pct, etc.).

### getActivities — Type C (Paginated audit log)
COUNT + paginated SELECT on `audit_logs LEFT JOIN users`. Simple enough to stay in
service alongside the Type C metrics function; no batch hydration applicable.

## Files Created

| File | Purpose |
|------|---------|
| `__legacy__/dashboard.controller.legacy.js` | Exact copy with fixed imports (reference) |
| `queries/metrics.sql.js` | 10 named SQL constants for getMetrics |
| `queries/activities.sql.js` | 2 named SQL constants for getActivities |
| `dashboard.service.js` | Business logic; imports SQL constants; uses `db` from shared |
| `dashboard.controller.js` | Slim adapter; delegates to service |

## SQL Patterns Observed

- `COUNT(*) FILTER (WHERE ...)` — conditional aggregation (attendance, machines)
- `EXTRACT(DAY FROM ...)` — date arithmetic for days_left
- Correlated subquery in FROM clause (`pq` for production progress)
- `COALESCE(u.full_name, u.username, 'Hệ thống')` — user display name fallback
- `Promise.all` with 10 queries — latency optimisation preserved

## No DAL / No Hydrator

Neither function has a natural batch key. All SQL runs as-is against `db`.
