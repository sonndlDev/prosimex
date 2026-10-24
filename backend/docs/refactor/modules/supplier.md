# Supplier Module — Refactor Notes

## Endpoints

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| GET | /api/suppliers | getSuppliers | suppliers:read |
| POST | /api/suppliers | createSupplier | suppliers:create |
| PUT | /api/suppliers/:id | updateSupplier | suppliers:update |
| DELETE | /api/suppliers/:id | deleteSupplier | suppliers:delete |

## Original List SQL (getSuppliers)

```sql
-- No COUNT query — original returns a flat array with no pagination
SELECT * FROM suppliers
WHERE deleted_at IS NULL
[ AND (name ILIKE $1 OR code ILIKE $1) ]
ORDER BY id DESC
```

Response: **flat array** `[...]` — no pagination envelope, no total/page/limit.

## Key Differences from Factory / Customer

1. **No pagination** — original does not accept `page`/`limit` query params; returns all matching rows.
2. **No users JOIN** — no `creator_name`/`modifier_name` in the SQL; hydrator is a no-op.
3. **Flat array response** — `res.json(result.rows)` not `res.json({ data, total, page, limit })`.
4. **Same `$1` reuse for OR** — original pushes the search value once and references `$1` twice; SqlParams correctly assigns separate `$n` values (functionally identical since both are the same value).

## Refactor Type

- Read: **refactored** — delegates to supplierService -> suppliersDal + hydrator (no-op) + mapper (pass-through)
- Mutations: **legacy re-export** — createSupplier, updateSupplier, deleteSupplier unchanged

## Data Types

- `suppliers.*` — all table columns (code, name, phone, address, deleted_at, etc.)
- Search fields: `name`, `code` (ILIKE)

## Files

| File | Role |
|------|------|
| `__legacy__/supplier.controller.legacy.js` | Preserved original controller (exact copy) |
| `../../dal/suppliers.dal.js` | DAL: findList only (no count, no users JOIN) |
| `supplier.filters.js` | buildWhere + ORDER_BY |
| `supplier.hydrator.js` | No-op (no users JOIN in original) |
| `supplier.mapper.js` | Pass-through (no computed fields) |
| `supplier.service.js` | getSuppliers orchestration — returns flat array |
| `supplier.controller.js` | Slim HTTP adapter |

## Status

`step 4 done (verify pending DB)`
