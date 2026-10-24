# DAL Registry

One DAL file per table. Check this file before creating any new DAL to avoid duplicates.

| Table | DAL File | Methods | Notes |
|-------|----------|---------|-------|
| `users` | `src/dal/users.dal.js` | `findByIds`, `count`, `findList`, `getRoles` | `findByIds` — no deleted_at filter (LEFT JOIN behaviour); `count`/`findList` — users JOIN roles with dynamic WHERE; `getRoles` — full roles list |
| `customers` | `src/dal/customers.dal.js` | `count`, `findList`, `findByIds`, `insert`, `update`, `softDelete` | contact_info alias included in SELECT_COLS |
| `factories` | `src/dal/factories.dal.js` | `count`, `findList`, `findByIds` | No users JOIN — hydration done separately; `findByIds` added for machine hydration |
| `suppliers` | `src/dal/suppliers.dal.js` | `findList` | No COUNT (no pagination), no users JOIN |
| `operations` | `src/dal/operations.dal.js` | `count`, `findList` | Includes `json_agg(product_groups)` in findList; users JOIN removed — hydration done separately |
| `machines` | `src/dal/machines.dal.js` | `count`, `findList` | COUNT preserves original LEFT JOIN factories; factory_name and users JOIN removed from findList — hydration done separately |
| `workers` | `src/dal/workers.dal.js` | `count`, `findList` | Both use alias "w"; no factory JOIN (original SELECT does not return factory_name); users JOIN removed — hydration done separately |
| `products` | `src/dal/products.dal.js` | `count`, `findList` | Both preserve LEFT JOIN product_groups (search filters on pg.name); product_group_name and users JOIN removed from SELECT — hydration done separately |
| `product_groups` | `src/dal/product_groups.dal.js` | `findByIds` | No deleted_at filter — matches original LEFT JOIN behaviour; SELECT id, name only |
| `attendance` | `src/dal/attendance.dal.js` | `count`, `findList`, `findTodayByUserId` | `count` and `findList` use JOIN users (alias "a"/"u"); `findTodayByUserId` returns single row with ICT date expression |
