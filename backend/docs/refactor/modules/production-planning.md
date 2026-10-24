# Module Refactor: production-planning

## Routes

| Method | Path | Handler | Classification |
|--------|------|---------|----------------|
| GET | /api/production-plans | getProductionPlans | Type C |
| GET | /api/production-plans/planned-status | getPlannedStatusByOrder | Type D (legacy) |
| POST | /api/production-plans | createProductionPlan | Type D (legacy) |
| POST | /api/production-plans/batch-order | createOrderGeneralPlan | Type D (legacy) |
| POST | /api/production-plans/clone/:id | cloneProductionPlan | Type D (legacy) |
| PUT | /api/production-plans/:id | updateProductionPlan | Type D (legacy) |
| PUT | /api/production-plans/:id/stop | stopPlan | Type D (legacy) |
| DELETE | /api/production-plans/:id | deleteProductionPlan | Type D (legacy) |

## Classifications

### getProductionPlans — Type C (Complex paginated read)

`countPlans` + `findPlans` from the original repository.
- Multi-table LEFT JOINs across: `orders`, `products`, `order_products`, `product_groups`, `product_group_operations`, `operations`, `machines`, `factories`, `users` (x2)
- Dynamic WHERE built imperatively: array filters use `ANY($N)`, date window uses `EXISTS` sub-select on `production_plan_days`
- Batch-loads plan days in a second query using `ANY($1)` with correlated scalar subqueries for `worker_count` and `worker_names` — no natural foreign-key hydration key that maps to a top-level DAL entity
- Post-processes in JS: groups days by `production_plan_id` into `daysMap`, attaches as `plan.days`
- Pagination: LIMIT/OFFSET appended after the WHERE clause
- **Type C wins** because of the multi-level `EXISTS` date filter, the scalar subqueries in the days SELECT, and the two-phase fetch pattern

### All mutations — Type D (legacy)

`createProductionPlan`, `updateProductionPlan`, `deleteProductionPlan`, `cloneProductionPlan`, `createOrderGeneralPlan`, `stopPlan`, `getPlannedStatusByOrder` remain in `production-planning.controller.legacy.js` and are re-exported from the slim controller.

## Files Created / Modified

| File | Purpose |
|------|---------|
| `__legacy__/production-planning.repository.legacy.js` | Exact copy of original repository (reference) |
| `queries/plans.sql.js` | `SQL_COUNT_PLANS`, `SQL_FIND_PLANS`, `SQL_FIND_PLAN_DAYS` named constants |
| `production-planning.service.js` | Business logic; `buildWhereClause` inlined; uses `db` from shared; imports SQL constants |
| `production-planning.controller.js` | Slim adapter; delegates to service; re-exports mutations from legacy |

## SQL Patterns Observed

- `COUNT(DISTINCT pp.id)` — counts unique plans (order JOIN may produce duplicates)
- `COALESCE(op_qty.quantity, o.quantity, 0)` — product-specific quantity fallback to order quantity
- `COALESCE(op_qty.product_name, p.name)` / `COALESCE(op_qty.product_group_name, pg.name)` — override chain for multi-product orders
- `COALESCE(pp.dinh_muc, pgo.dinh_muc)` — plan-level norm overrides operation-level norm
- `EXISTS (SELECT 1 FROM production_plan_days ... AND working_date::DATE >= $N)` — avoids TIMESTAMP vs DATE ambiguity for single-day filters
- Days query uses `ANY($1)` with two correlated scalar subqueries per row (`worker_count`, `worker_names`)
- `buildWhereClause` moved from repository class into service module-scope function (no OOP needed)

## No DAL / No Hydrator

The plan JOIN query is too wide to split into a base DAL + hydrated entities: it joins 9 tables in one SELECT and the days fetch uses scalar subqueries. Keeping SQL in `queries/plans.sql.js` and calling `db.query` directly from the service is the correct Type C approach.
