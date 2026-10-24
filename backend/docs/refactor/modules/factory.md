# Factory Module — Refactor Notes

## Endpoints

| Method | Path | Handler | Auth |
|--------|------|---------|------|
| GET | /api/factories | getFactories | ADMIN, PLANNER — factories:read |
| POST | /api/factories | createFactory | ADMIN — factories:create |
| PUT | /api/factories/:id | updateFactory | ADMIN — factories:update |
| DELETE | /api/factories/:id | deleteFactory | ADMIN — factories:delete |

## Original List SQL (getFactories)

```sql
-- COUNT query
SELECT COUNT(*) FROM factories
WHERE factories.deleted_at IS NULL
[ AND (factories.name ILIKE $1 OR factories.location ILIKE $1) ]

-- List query
SELECT factories.*,
       COALESCE(cu.full_name, cu.username) as creator_name,
       COALESCE(mu.full_name, mu.username) as modifier_name
FROM factories
LEFT JOIN users cu ON factories.created_by = cu.id
LEFT JOIN users mu ON factories.modified_by = mu.id
WHERE factories.deleted_at IS NULL
[ AND (factories.name ILIKE $1 OR factories.location ILIKE $1) ]
ORDER BY factories.created_at DESC
LIMIT $n OFFSET $n
```

Response envelope: `{ data: [...], total, page, limit }` — paginated.

## Refactor Type

- Read: **refactored** — delegates to factoryService -> factoriesDal + hydrator + mapper
- Mutations: **legacy re-export** — createFactory, updateFactory, deleteFactory unchanged

## Data Types

- `factories.*` — all table columns
- `creator_name` / `modifier_name` — hydrated via usersDal.findByIds (batch), COALESCE(full_name, username)
- Search fields: `name`, `location` (ILIKE)

## Files

| File | Role |
|------|------|
| `__legacy__/factory.controller.legacy.js` | Preserved original controller (exact copy) |
| `../../dal/factories.dal.js` | DAL: count + findList (no users JOIN) |
| `factory.filters.js` | buildWhere + ORDER_BY |
| `factory.hydrator.js` | attachOne creator/modifier via usersDal |
| `factory.mapper.js` | COALESCE logic, strips _creator/_modifier |
| `factory.service.js` | getFactories orchestration |
| `factory.controller.js` | Slim HTTP adapter |

## Status

`step 4 done (verify pending DB)`
