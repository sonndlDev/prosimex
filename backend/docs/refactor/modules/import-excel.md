# Import-Excel Module Refactor

## Status
Step 4 done (verify pending DB)

## Files Created

| File | Role |
|------|------|
| `src/modules/import-excel/__legacy__/import-excel.controller.legacy.js` | Exact copy of original; fixed import paths (`../../../`) |
| `src/modules/import-excel/import-excel.controller.js` | Slim re-export wrapper — all handlers forwarded from legacy |

## Endpoint Classification

| Endpoint | Handler | Type | Notes |
|----------|---------|------|-------|
| `POST /api/import-excel/master-data` | `importMasterData` | Type D (Write) | File processing + multi-table transaction (customers, product_groups, products, operations, product_group_operations) |
| `GET /api/import-excel/master-data/history` | `getImportHistory` | Type D (Audit) | Audit log query with pagination; grouped with mutations as write-centric module |

## Classification Rationale

### importMasterData — Type D (Write, Keep in Legacy)
- **Business Logic**: Multi-step orchestration of 5 entity types within a single transaction
- **SQL**: Complex INSERT/UPDATE/SELECT across customers, product_groups, operations, products, product_group_operations
- **Validation**: Row-by-row dedupe + cache logic (pgCache, opCache, prdCache) with cross-entity constraints
- **Transactional**: Full ACID semantics (BEGIN/COMMIT/ROLLBACK) with audit logging
- **State**: Tracks summary counts (created/existing/updated) across the import
- **Extraction Value**: Minimal — the handler is tightly coupled to transaction semantics; splitting to service+DAL adds indirection with no benefit per SPEC rule 7

### getImportHistory — Type D (Audit, Keep in Legacy)
- **Purpose**: Retrieve import audit trail with pagination + optional user search
- **SQL**: COUNT + paginated list from audit_logs with LEFT JOIN to users
- **Rationale**: Grouped with write handlers; low complexity (no hydration, no mapper), read auxiliary to import flow
- **Extraction Value**: Minimal — a service wrapper would be a thin HTTP-to-SQL passthrough

## No New DAL, Service, Hydrator, Mapper

Per SPEC rule 7: write-heavy modules with tightly-coupled transaction logic remain in legacy with re-export adapter. No service layer created; no DAL created. The slim controller is a pure re-export.

## Refactor Pattern Applied

Following established pattern from delete-impact (utility passthrough) and factory (legacy re-export for mutations):

1. Copy original controller → `__legacy__/import-excel.controller.legacy.js`
2. Fix import paths: `../../config/db.js` → `../../../config/db.js`
3. Replace original controller with slim adapter:
   ```javascript
   export { importMasterData, getImportHistory } from "./__legacy__/import-excel.controller.legacy.js";
   ```
4. Routes remain unchanged — no handler path changes needed

## API Response Shapes

### POST /api/import-excel/master-data

Request:
```json
{
  "rows": [
    {
      "customer": "ACME Inc",
      "product_group": "Electronics",
      "product": "Laptop A1",
      "operation": "Assembly",
      "dinh_muc": "2.5",
      "stt": 1
    }
  ]
}
```

Response (201):
```json
{
  "message": "Import thành công 50 dòng vào dữ liệu gốc.",
  "summary": {
    "customers": { "created": 3, "existing": 2 },
    "product_groups": { "created": 1, "existing": 4 },
    "operations": { "created": 0, "existing": 5 },
    "products": { "created": 10, "existing": 25 },
    "product_group_operations": { "created": 8, "existing": 3, "updated": 2 }
  }
}
```

Error (400, 500):
```json
{
  "message": "Không có dữ liệu để import"
}
```

### GET /api/import-excel/master-data/history

Response (200):
```json
{
  "data": [
    {
      "id": 1,
      "user_id": 123,
      "action": "IMPORT",
      "entity": "MasterData",
      "entity_id": 0,
      "after_data": "{...}",
      "created_at": "2026-10-15T16:00:00Z",
      "username": "admin",
      "full_name": "Administrator"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

## SQL Patterns Observed

### importMasterData Transaction Flow

1. **Customer Dedupe**: ILIKE LOWER TRIM → existing check
2. **Product Group Dedupe**: In-memory cache (pgCache) + DB fallback
3. **Operation Dedupe**: In-memory cache (opCache) + DB fallback
4. **Product Dedupe**: In-memory cache (prdCache) + cross-entity constraint validation
5. **Product Group Operations**: Pair-wise dedupe (product_group_id, operation_id) with optional update
6. **Audit**: INSERT into audit_logs with summary snapshot

### getImportHistory Query

```sql
SELECT COUNT(*) FROM audit_logs a
LEFT JOIN users u ON a.user_id = u.id
WHERE a.action = 'IMPORT' AND a.entity = 'MasterData'
[AND (LOWER(u.username) LIKE $1 OR LOWER(u.full_name) LIKE $1)]

SELECT a.*, u.username, u.full_name
FROM audit_logs a
LEFT JOIN users u ON a.user_id = u.id
WHERE a.action = 'IMPORT' AND a.entity = 'MasterData'
[AND (LOWER(u.username) LIKE $1 OR LOWER(u.full_name) LIKE $1)]
ORDER BY a.created_at DESC
LIMIT $limit OFFSET $offset
```

## Auth & RBAC

- POST: `authorize(["ADMIN", "PLANNER"], 'import_excel:create')`
- GET: `authorize(["ADMIN", "PLANNER"], 'import_excel:read')`
- Middleware: `verifyToken` + `authorize`
