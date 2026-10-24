# daily-ticket module — Refactor Notes

## Classification

| Method (original repository) | Type | Disposition |
|-------------------------------|------|-------------|
| `buildWhereClause` | — | Moved inline to `daily-ticket.service.js` as `buildWhereClause()` pure function |
| `countTickets` | C | SQL → `SQL_TICKETS_COUNT` in `queries/daily-ticket.sql.js`; called via `db.query` in service |
| `findTickets` | C | SQL → `SQL_TICKETS_LIST` + `SQL_TICKETS_LIST_GROUP_ORDER`; GROUP BY aggregates, STRING_AGG, correlated subquery on `production_plans` |
| `findById` | C | SQL → `SQL_TICKET_BY_ID`, `SQL_TICKET_ID_FROM_ITEM`, `SQL_TICKET_BY_ID_NO_MACHINE`, `SQL_TICKET_ITEMS_BY_TICKET_ID`; multi-table header + correlated subquery in items |
| `updateStatus` | D | Stays in legacy repository; used by `approveTicket`/`rejectTicket` via `dailyTicketRepository` |
| `findForUpdate` | D | Stays in legacy repository |
| `insertNotification` | D | Stays in legacy repository |
| `insertAuditLog` | D | Stays in legacy repository |

## Rationale for Type C

`findTickets` uses `GROUP BY`, `STRING_AGG(DISTINCT ...)` across multiple tables, and a correlated
subquery inside `LEFT JOIN production_plans` to resolve `remaining_quantity`. This pattern is not
batchable and not suitable for a DAL + hydrator approach.

`findById` is also Type C: the items query has a correlated subquery inside the `LEFT JOIN` on
`production_plans` (same pattern). Per SPEC rule "when in doubt between B and C, choose C."

## Files

| File | Role |
|------|------|
| `daily-ticket.service.js` | Rewritten: reads use `db.query` + SQL constants; writes delegate to legacy repository |
| `queries/daily-ticket.sql.js` | Named SQL constants: `SQL_TICKETS_COUNT`, `SQL_TICKETS_LIST`, `SQL_TICKETS_LIST_GROUP_ORDER`, `SQL_TICKET_BY_ID`, `SQL_TICKET_ID_FROM_ITEM`, `SQL_TICKET_BY_ID_NO_MACHINE`, `SQL_TICKET_ITEMS_BY_TICKET_ID` |
| `__legacy__/daily-ticket.repository.legacy.js` | Exact copy of the original `daily-ticket.repository.js`; used only for write helpers (`updateStatus`, `findForUpdate`, `insertNotification`, `insertAuditLog`, `transaction`) |
| `daily-ticket.controller.js` | Unchanged — already slim HTTP layer |
| `daily-ticket.controller.legacy.js` | Unchanged — original write handlers |

## No DAL created

No new DAL file was created for `daily_production_tickets`. The list query is Type C (GROUP BY
aggregates), so it does not qualify for the simple DAL pattern.
