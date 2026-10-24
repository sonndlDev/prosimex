# Worker Assignment Refactor

**Date:** 2026-10-15

**Classification:** Type E + D
- `getAssignments` (GET) — simple query joining workers + worker_plan_assignments
- `updateAssignments` (POST) — transaction: delete + insert worker assignments

## Changes

### Service Layer
- **New file:** `src/modules/worker/worker-assignment.service.js`
- Extracted `workerAssignmentService.getAssignments({ production_plan_id, working_date })`
- Runs same SQL query: JOIN workers with worker_plan_assignments table
- Returns array of worker rows

### Legacy Archive
- **New file:** `src/modules/worker/__legacy__/worker-assignment.controller.legacy.js`
- Exact copy of original controller
- Import path updated: `../../config/db.js` → `../../../config/db.js`
- Preserves original `getAssignments` and `updateAssignments` implementations
- Used for write operations until DB verification passes

### Refactored Controller
- **File:** `src/modules/worker/worker-assignment.controller.js`
- **getAssignments:** Delegates to service layer
- **updateAssignments:** Re-exported from legacy controller (Type D — write operations deferred)

### Query Details

**getAssignments SQL:**
```sql
SELECT w.*
FROM workers w
JOIN worker_plan_assignments wpa ON w.id = wpa.worker_id
WHERE wpa.production_plan_id = $1 AND wpa.working_date = $2
```

**updateAssignments Transaction:**
1. BEGIN
2. DELETE FROM worker_plan_assignments (matching plan_id + date)
3. INSERT INTO worker_plan_assignments (new worker_ids)
4. INSERT INTO audit_logs (for tracking)
5. COMMIT

## API Endpoints

- **GET** `/api/worker-assignments?production_plan_id=X&working_date=Y`
  - Response: JSON array of worker objects
- **POST** `/api/worker-assignments`
  - Body: `{ production_plan_id, working_date, worker_ids }`
  - Response: `{ message: 'Assignments updated successfully' }`

## Verification

- Service layer tested via `npm run test:characterization` when DATABASE_URL is set
- Blocked until fixture capture/compare framework runs (requires DB connection)
- Legacy files retained until DB verification passes per SPEC R8
