# Notification Module Refactor

## Status
Step 4 done (verify pending DB)

## Files Created

| File | Role |
|------|------|
| `src/modules/notification/__legacy__/notification.controller.legacy.js` | Exact copy of original; fixed import paths (`../../../`) |
| `src/modules/notification/notification.service.js` | `getNotifications()` — dynamic IN clause; no DAL (dynamic placeholders); extracts `resolveTargetRoles()` helper |
| `src/modules/notification/notification.controller.js` | Slim adapter; read → service; re-exports `markAsRead`, `markAllAsRead` from legacy |

## Endpoint Classification

| Endpoint | Type | Notes |
|----------|------|-------|
| `GET /` | E (simple read) | Dynamic IN clause on target_role; no pagination; no hydration |
| `PUT /:id/read` | D (write) | UPDATE single row — re-exported from legacy |
| `PUT /read-all` | D (write) | UPDATE with dynamic IN clause — re-exported from legacy |

## SQL Patterns Observed

- **Dynamic IN clause**: `targetRoles` array drives `$2, $3, ...` placeholders via `.map((_, i) => \`\$\${i + 2}\`)` — identical in `getNotifications` (service) and `markAllAsRead` (legacy); pattern preserved verbatim
- **Role resolution**: `resolveTargetRoles()` extracted to service — ADMIN and `daily_tickets:auto_approve` permission both grant visibility of PLANNER-targeted notifications
- **No pagination**: LIMIT 50 hardcoded; response envelope `{ success: true, data, unreadCount }`
- **unreadCount**: computed in JS from `result.rows.filter(n => !n.is_read).length` — no extra COUNT query
- **SELECT columns**: explicit column list `id, message, link, is_read, created_at` (not `*`) — preserved
- **Mutations**: `markAsRead` (UPDATE single row, no ownership check — by design per original comment), `markAllAsRead` (same dynamic IN as read) — both in legacy unchanged
