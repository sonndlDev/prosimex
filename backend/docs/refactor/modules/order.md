# order module — Refactor Notes

## Classification

| Method (original repository) | Type | Disposition |
|-------------------------------|------|-------------|
| `buildWhereClause` | — | Moved inline to `order.service.js` as `buildOrdersWhereClause()` + `buildSnapshotsWhereClause()` pure functions |
| `countOrders` | C | SQL → `SQL_ORDERS_COUNT`; joins customers + order_ext for filter support |
| `findOrders` | C | SQL → `SQL_ORDERS_LIST` + `SQL_ORDERS_LIST_ORDER`; 5-CTE query: product_stage_data, product_actuals, product_percentages, order_completion + correlated subquery per product |
| `findById` | C | SQL → `SQL_ORDER_BY_ID`; same 5-CTE structure, WHERE o.id = $1 |
| `findStatusById` | C | SQL → `SQL_ORDER_STATUS_BY_ID`; used to choose DONE vs LIVE completion report path |
| `getCompletionReportDone` | C | SQL → `SQL_COMPLETION_REPORT_DONE`; 6-CTE aggregation over inhouse/plating/packaging totals, uses `order_product_snapshots` for stage config |
| `getCompletionReportLive` | C | SQL → `SQL_COMPLETION_REPORT_LIVE`; same CTE structure, derives stage config from live `product_stage_configs` table |
| `getProductSnapshots` | C | SQL → `SQL_PRODUCT_SNAPSHOTS_COUNT` + `SQL_PRODUCT_SNAPSHOTS_LIST` + `SQL_PRODUCT_SNAPSHOTS_ORDER`; dynamic WHERE with optional drift filter |
| `insertOrder` | D | Stays in legacy repository; used by `createOrder` |
| `updatePoAutoCode` | D | Stays in legacy repository |
| `upsertOrderExt` | D | Stays in legacy repository |
| `insertAuditLog` | D | Stays in legacy repository |
| `softDelete` | D | Stays in legacy repository |
| `findForDelete` | D | Stays in legacy repository |

## Rationale for Type C

All read queries are classified Type C:

- **getOrders / findOrders**: 5 CTEs computing per-product actuals (correlated subqueries inside CTE), per-order completion percentage aggregated in JS. Not batchable.
- **findById**: Identical 5-CTE structure with a single-row predicate.
- **getCompletionReport**: 6-CTE aggregation with `json_agg` + `jsonb_array_elements`. Two code paths (DONE/LIVE) diverge at the stage-config source.
- **getProductSnapshots**: Dynamic WHERE with a computed boolean expression (`has_master_drift`) and optional drift filter — not a simple equality predicate list.

Per SPEC rule "when in doubt between B and C, choose C."

## JS post-processing

`calcCompletionPercentage` is a pure function in `order.service.js` that computes completion %
for each product row. It was moved from the original service without modification.

## Files

| File | Role |
|------|------|
| `order.service.js` | Rewritten: all reads use `db.query` + SQL constants; writes delegate to legacy repository |
| `queries/order.sql.js` | Named SQL constants (see table above); imports `ORDER_PRODUCT_JSON_FIELDS` from utils |
| `__legacy__/order.repository.legacy.js` | Exact copy of the original `order.repository.js`; used only for write helpers |
| `order.controller.js` | Unchanged — already slim HTTP layer |
| `order.controller.legacy.js` | Unchanged — original write handlers |

## No DAL created

No new DAL file was created for `orders`. All read queries are Type C. The DAL_REGISTRY.md is
unchanged.
