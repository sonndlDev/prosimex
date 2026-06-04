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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **prosimex** (4002 symbols, 6036 relationships, 113 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/prosimex/context` | Codebase overview, check index freshness |
| `gitnexus://repo/prosimex/clusters` | All functional areas |
| `gitnexus://repo/prosimex/processes` | All execution flows |
| `gitnexus://repo/prosimex/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
