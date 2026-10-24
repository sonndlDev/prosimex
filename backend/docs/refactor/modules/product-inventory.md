# Module Refactor: product-inventory

## Routes

| Method | Path | Handler | Classification |
|--------|------|---------|----------------|
| GET | /api/product-inventory | getInventory | Type C |
| POST | /api/product-inventory | saveInventory | Type D |
| PUT | /api/product-inventory/:id | updateInventory | Type D |
| PATCH | /api/product-inventory/:id/complete | completeInventory | Type D |
| POST | /api/product-inventory/:id/export | exportInventory | Type D |
| DELETE | /api/product-inventory/:id | deleteInventory | Type D |

## Classifications

### getInventory — Type C (Paginated list with correlated subquery)
Paginated list with a self-join correlated subquery computing `used_quantity` — the sum of
completed inventory quantities for the same (product_id, operation_id, inventory_type) tuple
recorded after the current row. Dynamic WHERE handles search across both `p.name` and
`o.name` with the same `$N` placeholder (ILIKE on both columns). The correlated subquery
makes batch hydration inapplicable — the query must run as-is.

### Type D mutations
- `saveInventory`: bulk INSERT in a transaction (array of items); single audit log entry
- `updateInventory`: SELECT for before-data, COALESCE UPDATE, audit log; full transaction
- `completeInventory`: sets `completed_at = CURRENT_TIMESTAMP`; audit log
- `exportInventory`: deducts from source row, creates new completed row — two writes in one
  transaction; validates quantity > 0, completed_at IS NULL, exportQty <= currentQty
- `deleteInventory`: soft-delete (`deleted_at = CURRENT_TIMESTAMP`); audit log

## Files Created

| File | Purpose |
|------|---------|
| `__legacy__/product-inventory.controller.legacy.js` | Exact copy with fixed imports |
| `queries/inventory.sql.js` | SQL_INVENTORY_COUNT_BASE + SQL_INVENTORY_DATA_BASE constants |
| `product-inventory.service.js` | getInventory logic; buildWhere helper inline |
| `product-inventory.controller.js` | Slim adapter; re-exports Type D from legacy |

## SQL Patterns Observed

- `IS NOT DISTINCT FROM` — NULL-safe equality for optional `operation_id` column
- Same `$N` placeholder reused for two columns in ILIKE clause (search across p.name OR o.name)
- `::numeric` cast on aggregated subquery result
- Correlated self-subquery in SELECT (used_quantity) — makes this definitively Type C
- Soft-delete pattern (`deleted_at = CURRENT_TIMESTAMP`) on all mutation operations
- Full audit trail: before_data + after_data on every mutation
