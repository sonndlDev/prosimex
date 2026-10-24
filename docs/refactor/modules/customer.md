# Module: customer

## 1. Endpoints

| Method | Path | Controller fn | Operation Type |
|--------|------|--------------|----------------|
| GET | /api/customers | `getCustomers` | Type A — list with JOIN for display names |
| POST | /api/customers | `createCustomer` | Type D — write with duplicate checks + audit |
| PUT | /api/customers/:id | `updateCustomer` | Type D — write with duplicate checks + audit |
| DELETE | /api/customers/:id | `deleteCustomer` | Type D — soft-delete with cascade + audit |

## 2. Function Classification (SPEC 3.11)

| Function | Type | Reason |
|----------|------|--------|
| `getCustomers` | A | List from `customers` JOIN `users` twice for creator/modifier names, pagination |
| `createCustomer` | D | INSERT with duplicate-name/code check + audit_logs INSERT |
| `updateCustomer` | D | UPDATE with before-fetch, duplicate check + audit_logs INSERT |
| `deleteCustomer` | D | Soft-delete within transaction, cascadeOnCustomerDelete, audit_logs INSERT |

## 3. Related Tables and Join Conditions

### Primary table: `customers`
- Filter: `deleted_at IS NULL` on all operations

### Join for display:
- `LEFT JOIN users cu ON c.created_by = cu.id` — no deleted_at filter on users (note: joins all users regardless)
- `LEFT JOIN users mu ON c.modified_by = mu.id` — no deleted_at filter on users

### Cascade on delete (via `cascadeOnCustomerDelete`):
- `UPDATE orders SET customer_id = NULL WHERE customer_id = $1 AND deleted_at IS NULL`

## 4. Column Types

Based on typical PostgreSQL schema analysis (DB unavailable at survey time):

| Column | Expected Type | pg JS type | ANY cast |
|--------|--------------|-----------|----------|
| id | integer | number | `int[]` |
| code | varchar | string | `text[]` |
| name | varchar | string | `text[]` |
| address | varchar/text | string | — |
| phone | varchar | string | — |
| is_active | boolean | boolean | — |
| created_by | integer | number | `int[]` |
| modified_by | integer | number | `int[]` |
| created_at | timestamptz | string (type parser active) | — |
| updated_at | timestamptz | string (type parser active) | — |
| deleted_at | timestamptz | string (type parser active) | — |
| modified_time | timestamptz | string (type parser active) | — |

Note: `modified_time` appears in UPDATE/DELETE SQL (alongside `updated_at`) — the customers table has both columns.

### users table (for hydration):
| Column | Type |
|--------|------|
| id | integer |
| username | varchar |
| full_name | varchar |

## 5. Business Rules

1. **Duplicate name check** (CREATE): `LOWER(name) = LOWER($1) AND deleted_at IS NULL`
2. **Duplicate code check** (CREATE): `LOWER(code) = LOWER($1) AND deleted_at IS NULL`
3. **Duplicate name check** (UPDATE): `LOWER(name) = LOWER($1) AND deleted_at IS NULL AND id != $2`
4. **Duplicate code check** (UPDATE): `LOWER(code) = LOWER($1) AND deleted_at IS NULL AND id != $2`
5. **contact_info alias**: `finalAddress = contact_info || address` — body can use either field name
6. **COALESCE on insert**: `COALESCE($5, true)` — `is_active` defaults to true
7. **COALESCE on update**: `COALESCE($1, col)` — partial update pattern; code field included in UPDATE params but not exposed as intentional change
8. **creator_name display**: `COALESCE(cu.full_name, cu.username)` — prefers full_name, falls back to username
9. **modifier_name display**: `COALESCE(mu.full_name, mu.username)` — same rule
10. **contact_info alias in SELECT**: `c.address as contact_info` returned alongside `c.*` (so address appears twice: once as `address`, once as `contact_info`)

### SQL quirk in getCustomers:
The WHERE clause uses string replace:
```js
whereClause.replace(/deleted_at/g, 'c.deleted_at')
           .replace(/name/g, 'c.name')
           .replace(/code/g, 'c.code')
```
This means when `search` is present, `c.name ILIKE $1 OR code ILIKE $1` becomes `c.c.name ILIKE $1 OR c.code ILIKE $1` — the `name` → `c.name` replace runs first on `code`, turning it into `c.code` is fine, but `name` matches inside `column` keyword is a concern. On `ILIKE $n`, the replace produces `c.code ILIKE` correctly but `c.name ILIKE` (name→c.name applies to `name` substring of `column_name`? No — the WHERE has `name ILIKE` not `column_name`). Effect: search filter works with properly aliased columns in final query.

## 6. Plan

### DALs to create:
1. **`backend/src/dal/customers.dal.js`** — `count`, `findList`, `findByIds`, `insert`, `update`, `softDelete`
2. **`backend/src/dal/users.dal.js`** — `findByIds` (id, username, full_name)

### Module files to create:
- `customer.filters.js` — `buildWhere(f, params)`
- `customer.hydrator.js` — attaches `creator` and `modifier` from users
- `customer.mapper.js` — applies COALESCE name logic, adds `contact_info` alias, removes hydrator keys
- `customer.service.js` — `getCustomers`, write methods delegating to DAL
- `customer.controller.js` (updated) — slim HTTP adapter; write functions from legacy

### getCustomers response shape (from controller, line 32):
```json
{
  "data": [
    {
      // All c.* columns (id, code, name, address, phone, is_active, created_by, modified_by, created_at, updated_at, deleted_at, modified_time)
      // PLUS: contact_info (alias of address)
      // PLUS: creator_name (COALESCE of full_name/username from users)
      // PLUS: modifier_name (COALESCE of full_name/username from users)
    }
  ],
  "total": <number from parseInt(COUNT)>,
  "page": <number>,
  "limit": <number>
}
```

## 7. Risks

1. **D-customer-1**: `getCustomers` sends `error` object to client on 500: `res.status(500).json({ message: "...", error })` — potential stack trace leak. Kept as-is per SPEC.
2. **D-customer-2**: The regex-based WHERE qualifier (`whereClause.replace(...)`) in the original is fragile — if column/alias names change, the regex breaks. The new `buildWhere` avoids this entirely with explicit `c.` prefix.
3. **D-customer-3**: `c.*` in SELECT returns ALL columns including `deleted_at` and `modified_time` in the list response. New DAL must select the same columns.
4. **ORDER BY created_at DESC** — uses unqualified `created_at` in LIMIT query. Should be `c.created_at DESC`. Replicating exactly in new code.
5. **No test DB available** at survey time — characterization fixtures cannot be captured. DB must be running to complete steps 2 and 5 per SPEC 10.1.

## 8. Query Count (after refactor)

`getCustomers`: 3 queries — COUNT, SELECT list, SELECT users batch (creators + modifiers combined via `attachOne`).

Old code: 3 queries (COUNT + list SELECT with 2 JOINs = 2 queries total, but JOINs are within the same query).
Actually old: 2 queries — COUNT + main SELECT (which has 2 JOINs inline).
New: 3 queries — COUNT + main SELECT (no JOINs) + 1 user batch load.

Trade-off: one extra query but cleaner separation. User load is O(1) queries regardless of page size.
