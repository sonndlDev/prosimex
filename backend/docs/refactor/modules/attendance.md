# Attendance Module Refactor

## Status
Step 4 done (verify pending DB)

## Files Created

| File | Role |
|------|------|
| `src/modules/attendance/__legacy__/attendance.controller.legacy.js` | Exact copy of original; fixed import paths (`../../../`) |
| `src/dal/attendance.dal.js` | `count()` + `findList()` (paginated logs with JOIN users) + `findTodayByUserId()` (single-row today read) |
| `src/modules/attendance/attendance.filters.js` | `buildWhere()` — builds WHERE + params array for log queries |
| `src/modules/attendance/attendance.service.js` | `getAttendanceLogs()` (Promise.all count+list) + `getTodayStatus()` |
| `src/modules/attendance/attendance.controller.js` | Slim adapter; reads → service; re-exports `checkIn`, `checkOut` from legacy |

## Endpoint Classification

| Endpoint | Type | Notes |
|----------|------|-------|
| `POST /check-in` | D (write) | INSERT + audit_log — re-exported from legacy |
| `POST /check-out` | D (write) | UPDATE + audit_log — re-exported from legacy |
| `GET /today` | E (simple read) | Single-row SELECT on attendance by user+date |
| `GET /logs` | B (paginated read) | JOIN users, dynamic WHERE by role, pagination |

## SQL Patterns Observed

- **Pagination**: yes — `LIMIT $n OFFSET $n`, standard `{ data, total, page, limit }` envelope
- **WHERE build**: imperative `params.push()` + string interpolation — preserved exactly in `buildWhere()`; no SqlParams used (WHERE starts at `$1`, dynamic positional params)
- **Role-based filter**: non-ADMIN forced to own records; ADMIN can filter by `targetUserId` or see all (`ALL_USERS`)
- **Date range**: `a.date >= startDate` and `a.date <= endDate` (inclusive)
- **JOIN**: `attendance a JOIN users u ON a.user_id = u.id` — SELECT returns `a.*, u.username`; no further hydration needed (username already on the row)
- **COUNT query**: includes same JOIN as list query (affects total when user filter is applied)
- **ICT date**: `(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date` — preserved verbatim in DAL
- **ORDER BY**: `a.date DESC, a.check_in_time DESC`
- **Mutations**: `checkIn` (INSERT + audit), `checkOut` (UPDATE + audit) — both in legacy unchanged
