# Module Refactor: outsourcing

## Routes

| Method | Path | Handler | Classification |
|--------|------|---------|----------------|
| GET | /api/outsourcing/export-detailed | exportDetailedItems | Type C |
| GET | /api/outsourcing/remaining-quantity | getRemainingQuantity | Type D (legacy) |
| GET | /api/outsourcing | getTickets | Type D (legacy) |
| GET | /api/outsourcing/:ticket_code | getTicketByCode | Type D (legacy) |
| POST | /api/outsourcing | createTicket | Type D (legacy) |
| POST | /api/outsourcing/:ticket_id/returns | addReturnEntry | Type D (legacy) |
| PUT | /api/outsourcing/returns/:return_id | updateReturnEntry | Type D (legacy) |
| PUT | /api/outsourcing/:id | updateTicket | Type D (legacy) |
| DELETE | /api/outsourcing/returns/:return_id | deleteReturnEntry | Type D (legacy) |
| DELETE | /api/outsourcing/:id | deleteTicket | Type D (legacy) |

## Classifications

### exportDetailedItems — Type C (CTE aggregation report)

`findDetailedItems` from the original repository.
- Uses a `WITH returns_agg AS (...)` CTE that aggregates `outsourcing_returns` per `ticket_item_id`: MAX, SUM x6, `string_agg` with FILTER
- Main SELECT JOINs: `outsourcing_tickets`, `suppliers`, `orders`, `products`, LEFT JOIN to the CTE
- Dynamic WHERE built imperatively: type equality, ILIKE search across two columns (same param index), order_id/product_id equalities, conditional DATE expression depending on `type === 'PACKAGING'`
- No pagination — returns all matching rows (export endpoint)
- No natural batch-loading key: the CTE already pre-aggregates returns inside the single query
- **Type C wins** because of the CTE with multiple aggregate functions and the `FILTER` clause

### All mutations — Type D (legacy)

`getRemainingQuantity`, `getTickets`, `getTicketByCode`, `createTicket`, `addReturnEntry`, `updateReturnEntry`, `deleteReturnEntry`, `updateTicket`, `deleteTicket` remain in `outsourcing.controller.legacy.js` and are re-exported from the slim controller.

Note: `getTickets` is a paginated read in the legacy controller that uses CTEs with multiple aggregations — it was not in the repository.js and is retained as legacy (not migrated in this step).

## Files Created / Modified

| File | Purpose |
|------|---------|
| `__legacy__/outsourcing.repository.legacy.js` | Exact copy of original repository (reference) |
| `queries/outsourcing.sql.js` | `SQL_FIND_DETAILED_ITEMS` named constant |
| `outsourcing.service.js` | Business logic; `buildWhereClause` inlined; uses `db` from shared; imports SQL constant |
| `outsourcing.controller.js` | Slim adapter; delegates to service; re-exports mutations from legacy |

## SQL Patterns Observed

- `WITH returns_agg AS (...)` CTE — pre-aggregates returns before the main SELECT to avoid N+1 and fan-out
- `string_agg(r.notes, '; ' ORDER BY r.returned_at) FILTER (WHERE r.notes IS NOT NULL AND r.notes != '')` — conditional string aggregation
- `COALESCE(NULLIF(BTRIM(CONCAT_WS(' - ', o.order_code, o.name)), ' - '), o.order_code, o.name)` — defensive order display string
- `DATE(t.dispatch_date)` / `DATE(t.created_at)` — conditional date filter based on ticket type
- Same `$N` parameter used twice in ILIKE clause (both `ticket_code` and `s.name`) — positional param reuse preserved

## No DAL / No Hydrator

The CTE aggregation cannot be split into a batch-loading hydrator: the aggregation and the main row data are co-located in one SQL statement. Keeping SQL in `queries/outsourcing.sql.js` and calling `db.query` directly from the service is the correct Type C approach.
