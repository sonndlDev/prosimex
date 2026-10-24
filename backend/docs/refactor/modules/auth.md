# Auth Module Refactor

## Status
Step 4 done (verify pending DB)

## Files Created

| File | Role |
|------|------|
| `src/modules/auth/__legacy__/auth.controller.legacy.js` | Exact copy of original; fixed import paths (`../../../`) |
| `src/modules/auth/auth.service.js` | `getMe()` — single-row SELECT with JOIN roles; throws `{status:404}` on not-found |
| `src/modules/auth/auth.controller.js` | Slim adapter; `getMe` → service; re-exports `login`, `refreshToken` from legacy |

## Endpoint Classification

| Endpoint | Type | Notes |
|----------|------|-------|
| `POST /login` | D (write/auth) | bcrypt compare + JWT sign — re-exported from legacy |
| `POST /refresh-token` | D (write/auth) | JWT verify + re-issue access token — re-exported from legacy |
| `GET /me` | E (simple authenticated read) | Single-row SELECT users JOIN roles by req.user.id |

## SQL Patterns Observed

- **userSelectWithRole**: `SELECT u.*, r.name as role_name, r.permissions as role_permissions FROM users u JOIN roles r ON u.role_id = r.id` — reused across all three handlers; extracted as constant `SQL_USER_WITH_ROLE` in service
- **getMe filter**: `WHERE u.id = $1 AND u.deleted_at IS NULL`
- **login filter**: `WHERE u.username = $1 AND u.is_active = true AND u.deleted_at IS NULL`
- **refreshToken filter**: `WHERE u.id = $1 AND u.is_active = true AND u.deleted_at IS NULL`
- **Permissions**: `mergeEffectivePermissions(user.permissions, user.role_permissions)` — union of user-specific grants + role defaults
- **No pagination**, no batch loading — auth is pure single-row lookup
- **JWT**: access token 4h (`JWT_SECRET`), refresh token 7d (`JWT_REFRESH_SECRET`)
- **Mutations**: `login` (bcrypt + jwt.sign), `refreshToken` (jwt.verify + jwt.sign) — both in legacy unchanged
