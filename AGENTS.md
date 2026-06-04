# AGENTS.md — Prosimex MES

Manufacturing Execution System. Monorepo: `backend/` (Node 18, Express, PostgreSQL, Babel) + `frontend/` (React 19, Vite, Tailwind CSS, shadcn/ui).

## Commands

```bash
# Backend (from /backend)
npm run dev              # nodemon + babel-node, port 3000
npm run lint             # eslint src --ext js
npm run db:init          # create base schema (scripts/db_init.js)
npm run db:migrate migrations/<file>.sql   # run one migration

# Frontend (from /frontend)
npm run dev              # vite dev server, port 5173
npm run lint             # eslint .
npm run build            # vite build → dist/
```

No test framework is configured. There is no typecheck step (plain JS, no TypeScript).

## Critical Rules

These are non-negotiable — violations cause data corruption or broken UI:

- **No hard deletes.** Always soft-delete: `SET deleted_at = CURRENT_TIMESTAMP`. Every SELECT in reports/dashboards must include `WHERE deleted_at IS NULL`.
- **Transactions for multi-step writes.** Use `pool.connect()`, `BEGIN`/`COMMIT`/`ROLLBACK`, `client.release()` in `finally`.
- **Audit log** every critical INSERT/UPDATE/soft-DELETE to `audit_logs` table (action, user_id from `req.user.id`, entity, entity_id, before_data/after_data).
- **Invalidate React Query cache** after any mutation: `queryClient.invalidateQueries({ queryKey: [...] })`. Never rely on page reload.
- **Use existing shadcn/ui components** from `frontend/src/components/ui/`. Do not create basic UI components from scratch.
- **Sticky table columns**: when adding columns to reports, recalculate `minWidth`, `width`, and `left` offsets — pixel-based sticky positioning breaks easily.

## Adding a New Module (checklist)

**Backend:**
1. Create `src/modules/<name>/<name>.controller.js` + `<name>.routes.js`
2. Mount in `src/server.js`: `app.use('/api/<name>', routeModule)`
3. Use `authorize(roles, '<module>:<action>')` middleware

**Frontend:**
1. Add permission keys to `PERMISSION_GROUPS` in `src/constants/permissions.js`
2. Create service: `src/services/<name>.service.js` (pattern: `{ getAll, create, update, delete }`)
3. Create page under `src/pages/<name>/`
4. Add lazy-loaded route in `src/AppRouter.jsx` wrapped in `<ProtectedRoute requiredPermission="<module>:read" />`
5. Add menu entry in `src/layouts/MainLayout.jsx` `menuItems` array

## Architecture Notes

- **Path aliases**: Backend uses `~` → `./src` (Babel module-resolver). Frontend uses `@` → `./src` (Vite resolve.alias).
- **Timezone**: `Asia/Ho_Chi_Minh` is hardcoded in `server.js` (`process.env.TZ`). All dates/times use this.
- **Permission format**: `{module}:{action}` where actions are `menu | read | create | update | delete | auto_approve`.
- **Roles**: `ADMIN` (bypasses all), `PLANNER`, `OPERATOR`. ADMIN always passes `authorize()`.
- **Scheduler**: `node-cron` runs daily at 14:00 (Asia/Ho_Chi_Minh) to auto-generate daily production tickets for tomorrow. Logic in `src/workers/dailyTicketWorker.js`.
- **Real-time**: Socket.io — planners/admins join `planners_room`. Frontend connects in `MainLayout.jsx`.
- **Cascade deletes**: Defined in `src/utils/cascade-delete.util.js`. Deleting a factory cascades to machines → plans → schedules → tickets. Impact is previewed via `src/utils/delete-impact.util.js` before confirming.
- **DB migrations**: Run manually one-by-one. Order matters. Start with `migrations/init.sql`, then chronological files.

## Conventions

- DB columns: `snake_case`. JS variables: `camelCase`.
- Backend: no semicolons, single quotes, 2-space indent (enforced by ESLint).
- Frontend: `.jsx` files, no TypeScript.
- Service pattern: each FE module has `services/<name>.service.js` wrapping axios calls.
- Shared table component: `GenericTable` with sort/filter/pagination/bulk-select. Audit columns via `getAuditColumn()` from `utils/audit.jsx`.
- Token refresh: proactive (< 5 min remaining) + reactive (401 retry queue) in `services/api.js`. Do not modify the `isRefreshing`/`failedQueue` logic.
