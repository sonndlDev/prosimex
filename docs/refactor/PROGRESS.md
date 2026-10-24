# PROGRESS — Batch-Loading Refactor

## Bootstrap Status: done

**Date:** 2026-10-15

Infrastructure created:
- `src/shared/db/index.js` — re-exports pool
- `src/shared/db/sql-builder.js` — SqlParams + Where
- `src/shared/db/query-counter.js` — test query counter
- `src/shared/batch/batch.js` — uniq, keyBy, groupBy, attachOne, attachMany, chunked
- `src/shared/batch/request-loader.js` — request-scoped loader
- `tests/shared/sql-builder.test.js` — unit tests
- `tests/shared/batch.test.js` — unit tests
- `tests/characterization/capture.js` — fixture capture framework
- `tests/characterization/compare.js` — fixture compare framework

### Type Parser Note
`pg` types.setTypeParser is active:
- DATE (OID 1082) → string "YYYY-MM-DD"
- TIMESTAMP (OID 1114) → string "YYYY-MM-DDTHH:MM:SS"
- TIMESTAMPTZ (OID 1184) → string "YYYY-MM-DDTHH:MM:SS+07"
- bigint/numeric/COUNT/SUM/ROUND → string (e.g. "45.50")
- integer/smallint → number
- numeric inside json_build_object → number

---

## Modules — All step 4 done (verify pending DB)

| Module | Classification | Approach | Notes |
|--------|----------------|----------|-------|
| customer | A+D | DAL + batch users hydrator | Pagination envelope; creator/modifier names |
| factory | A+D | DAL + batch users hydrator | Pagination; creator/modifier names |
| supplier | E+D | DAL, flat array | No pagination, no users JOIN |
| operation | A+D | DAL + batch users | json_agg product_groups kept in DAL query |
| machine | A+D | DAL + batch factories+users | factory_id filter; two-col ORDER BY |
| worker | A+D | DAL + batch users | Pagination; search on name+code |
| product | A+D | DAL + batch product_groups+users | LEFT JOIN pg kept for search |
| attendance | B+D | DAL + filters | Date range + user_id filter |
| machine-schedule | C | SQL in service | Conditional JOIN type; date logic |
| notification | E+D | Service inline SQL | Dynamic role-based IN clause |
| delete-impact | utility | Re-export from legacy | All logic in delete-impact.util.js |
| auth | E+D | Service (getMe) | Single-user fetch with role JOIN |
| user | A+D | Extended users.dal.js + hydrator | count/findList added to users.dal.js |
| dashboard | C | queries/metrics.sql.js | 10 parallel queries; Promise.all |
| product-group | A+C+D | filters + queries/*.sql.js | getProductGroups=A; operations/stages=C |
| product-inventory | C+D | queries/inventory.sql.js | Correlated self-subquery; IS NOT DISTINCT FROM |
| import-excel | D | Re-export from legacy | Multi-table transaction; all writes |
| production-planning | C+D | queries/plans.sql.js | 9-table JOIN; scalar subqueries |
| outsourcing | C+D | queries/outsourcing.sql.js | CTE returns_agg; 7 aggregates |
| daily-ticket | C+D | queries/daily-ticket.sql.js | 7 SQL constants; json_agg items |
| order | C+D | queries/order.sql.js | 11 SQL constants; 5-CTE + 6-CTE queries |
| worker-assignment | E+D | Service (getAssignments) | Simple join query; write in legacy |

### Pending
- All modules: characterization fixture capture + compare blocked (DATABASE_URL not set in Claude env)
- Per SPEC R8: __legacy__ files retained until DB verify passes
- To verify: set DATABASE_URL in .env and run `npm run test:characterization` per module
