# Module Refactor: product-group

## Routes

| Method | Path | Handler | Classification |
|--------|------|---------|----------------|
| GET | /api/product-groups/export | exportProductGroups | Type C |
| GET | /api/product-groups | getProductGroups | Type A |
| POST | /api/product-groups | createProductGroup | Type D |
| PUT | /api/product-groups/:id | updateProductGroup | Type D |
| DELETE | /api/product-groups/:id | deleteProductGroup | Type D |
| GET | /api/product-groups/:id/operations | getProductGroupOperations | Type C |
| POST | /api/product-groups/:id/operations | createProductGroupOperation | Type D |
| PUT | /api/product-groups/:id/operations/reorder | reorderProductGroupOperations | Type D |
| PUT | /api/product-groups/:id/operations/:operationId | updateProductGroupOperation | Type D |
| DELETE | /api/product-groups/:id/operations/:operationId | deleteProductGroupOperation | Type D |
| GET | /api/product-groups/:id/stage-configs | getStageConfigs | Type C |
| PUT | /api/product-groups/:id/stage-configs | saveStageConfigs | Type D |

## Classifications

### getProductGroups — Type A (Paginated list)
Standard paginated list: COUNT + SELECT with LEFT JOIN users for creator/modifier names.
Dynamic WHERE built by `product-group.filters.js`. Count uses unaliased WHERE; data uses
pg-aliased WHERE. Runs both queries in parallel.

### getProductGroupOperations — Type C (Complex conditional SQL)
Two mutually exclusive query shapes depending on whether `order_id` + `product_id` are
provided. The contextual shape uses correlated subqueries for `is_planned`, `total_actual`,
and `order_quantity`. A second query fetches manual production rows (operation_id IS NULL)
and appends a synthetic "Không công đoạn" row when non-zero. No batch key applicable.

### getStageConfigs — Type C (Multi-query aggregation)
Three parallel queries: stage configs, all products in group, and operation count. Results
merged in JS via a configsMap lookup. No pagination, no batch key.

### exportProductGroups — Type C (Multi-table JOIN export)
Single wide SELECT spanning product_groups → products → product_stage_configs →
product_group_operations → operations → machines (subquery) → users (creator + modifier).
Dynamic WHERE appended to SQL_EXPORT_BASE. No pagination.

### Type D mutations
createProductGroup, updateProductGroup, deleteProductGroup (uses cascadeOnProductGroupDelete
in a transaction), createProductGroupOperation (duplicate id + name checks),
updateProductGroupOperation, deleteProductGroupOperation, reorderProductGroupOperations
(two-pass update to avoid unique constraint violations), saveStageConfigs (UPSERT loop).

## Files Created

| File | Purpose |
|------|---------|
| `__legacy__/product-group.controller.legacy.js` | Exact copy with fixed imports |
| `queries/product-group.sql.js` | Named SQL constants for all Type C reads |
| `product-group.filters.js` | buildWhere / buildWhereUnaliased helpers |
| `product-group.service.js` | Business logic for Type A + C reads |
| `product-group.controller.js` | Slim adapter; re-exports Type D from legacy |

## SQL Patterns Observed

- `string_agg(m.name, ', ')` correlated subquery on machines array
- `EXISTS (SELECT 1 FROM production_plans ...)` for is_planned flag
- `IS NOT DISTINCT FROM` for NULL-safe operation_id comparison (inventory-style)
- Two-pass reorder (sequence_order + 1000 then real value) to bypass unique constraint
- UPSERT (`ON CONFLICT DO UPDATE`) in saveStageConfigs loop
- `cascadeOnProductGroupDelete` utility called inside BEGIN/COMMIT transaction
