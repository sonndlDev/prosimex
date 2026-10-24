# DAL REGISTRY

Organized by table. One DAL file per table.

| Table | DAL File | Functions | Modules Using |
|---|---|---|---|
| `customers` | `src/dal/customers.dal.js` | `count(where, params)`, `findList(where, orderBy, limit, offset, params)`, `findByIds(ids)`, `insert(data)`, `update(id, data)`, `softDelete(id)` | customer |
| `users` | `src/dal/users.dal.js` | `findByIds(ids)`, `count(where, params)`, `findList(where, limit, offset, params)`, `getRoles()` | customer, factory, machine, worker, product, operation, user, auth |
| `factories` | `src/dal/factories.dal.js` | `count(where, params)`, `findList(where, orderBy, limit, offset, params)`, `findByIds(ids)` | factory, machine |
| `suppliers` | `src/dal/suppliers.dal.js` | `findList(where, orderBy, params)` | supplier |
| `operations` | `src/dal/operations.dal.js` | `count(where, params)`, `findList(where, orderBy, limit, offset, params)` | operation |
| `machines` | `src/dal/machines.dal.js` | `count(where, params)`, `findList(where, orderBy, limit, offset, params)` | machine |
| `workers` | `src/dal/workers.dal.js` | `count(where, params)`, `findList(where, orderBy, limit, offset, params)` | worker |
| `products` | `src/dal/products.dal.js` | `count(where, params)`, `findList(where, orderBy, limit, offset, params)` | product |
| `product_groups` | `src/dal/product_groups.dal.js` | `findByIds(ids)` | product, product-group (hydrator) |
| `attendance` | `src/dal/attendance.dal.js` | `count(where, params)`, `findList(where, orderBy, limit, offset, params)`, `findTodayByUserId(userId)` | attendance |

### Notes
- Tables accessed via Type C SQL (not through DAL): `orders`, `daily_tickets`, `production_plans`, `outsourcing_tickets`, `product_group_operations`, `product_stage_configs`, `product_inventory`, `dashboard aggregate tables`, `worker_plan_assignments`
- Type C tables intentionally bypass DAL pattern per SPEC 3.11
