# User Module Refactor

## Status
Step 4 done (verify pending DB)

## Files Created

| File | Role |
|------|------|
| `src/modules/user/__legacy__/user.controller.legacy.js` | Exact copy of original; fixed import paths (`../../../`) |
| `src/modules/user/user.filters.js` | `buildWhere()` — builds WHERE + params for users count/list queries |
| `src/modules/user/user.mapper.js` | `mapUser()` / `mapUsers()` — removes `role_permissions`; adds `effective_permissions` via `mergeEffectivePermissions` |
| `src/modules/user/user.service.js` | `getUsers()` (Promise.all count+list) + `getRoles()` |
| `src/modules/user/user.controller.js` | Slim adapter; reads → service; re-exports all mutations from legacy |
| `src/dal/users.dal.js` (extended) | Added `count()`, `findList()`, `getRoles()` methods to existing DAL |

## Endpoint Classification

| Endpoint | Type | Notes |
|----------|------|-------|
| `GET /` | A (paginated list) | COUNT + paginated SELECT, search filter, JOIN roles, effective_permissions computed |
| `GET /roles` | E (simple list read) | No pagination; SELECT all roles ORDER BY name ASC |
| `POST /roles` | D (write) | INSERT roles — re-exported from legacy |
| `PUT /roles/:id/permissions` | D (write) | UPDATE roles.permissions — re-exported from legacy |
| `DELETE /roles/:id` | D (write, transaction) | ROLLBACK-safe: check is_system, reassign users, DELETE role — re-exported from legacy |
| `POST /` | D (write) | bcrypt hash + INSERT users — re-exported from legacy |
| `PUT /:id` | D (write) | COALESCE UPDATE users — re-exported from legacy |
| `DELETE /:id` | D (write, soft delete) | `UPDATE users SET deleted_at = CURRENT_TIMESTAMP` — re-exported from legacy |
| `PUT /profile/update` | D (write) | Authenticated user updates own profile — re-exported from legacy |

## SQL Patterns Observed

- **COUNT query**: `SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id {where}` — same JOIN as list query
- **List query**: `SELECT u.id, u.username, u.full_name, u.phone, u.email, u.role_id, r.name as role_name, u.factory_id, u.is_active, u.created_at, u.permissions, r.permissions as role_permissions FROM users u JOIN roles r ON u.role_id = r.id {where} ORDER BY u.created_at DESC LIMIT $n OFFSET $n`
- **WHERE build**: starts as `WHERE u.deleted_at IS NULL`; optionally appends `AND (u.username ILIKE $1 OR u.full_name ILIKE $1)` using the same `$1` param for both columns (original behaviour preserved exactly)
- **Mapping**: original mutates rows with `delete row.role_permissions` then spreads + adds `effective_permissions`; mapper refactored to use destructuring (immutable)
- **getRoles**: `SELECT id, name, is_system, permissions, created_at FROM roles ORDER BY name ASC`
- **deleteRole**: transactional — checks `is_system`, finds `DEFAULT_USER` role, reassigns users, then deletes role; uses `pool.connect()` + `client.query('BEGIN/COMMIT/ROLLBACK')` — kept intact in legacy
- **createUser/updateUser**: `normalizePermissions()` applied to incoming permissions; `bcrypt.genSalt(10)` for password hashing
- **updateUser**: COALESCE pattern for all fields; empty string → null coercion before query
- **updateProfile**: user updates own `full_name, phone, email, password` only (no role/factory change)
- **Pagination envelope**: `{ data, total, page, limit }` — matches existing API contract
