# Refactor Progress

| Module | Status | Notes |
|--------|--------|-------|
| customer | step 4 done (verify pending DB) | Full refactor including mutations in service |
| factory | step 4 done (verify pending DB) | Read refactored; mutations re-exported from legacy |
| supplier | step 4 done (verify pending DB) | Read refactored; mutations re-exported from legacy |
| operation | step 4 done (verify pending DB) | Read refactored; mutations re-exported from legacy |
| machine | step 4 done (verify pending DB) | Read refactored; mutations re-exported from legacy |
| worker | step 4 done (verify pending DB) | Read refactored; mutations re-exported from legacy |
| product | step 4 done (verify pending DB) | Read refactored; mutations re-exported from legacy; new product_groups.dal.js created |
| attendance | step 4 done (verify pending DB) | Read refactored (getTodayStatus + getAttendanceLogs); mutations re-exported from legacy; new attendance.dal.js created |
| machine-schedule | step 4 done (verify pending DB) | Type C read-only; SQL kept in service; no DAL/hydrator/mapper; no mutations |
| notification | step 4 done (verify pending DB) | getNotifications refactored to service; markAsRead + markAllAsRead re-exported from legacy |
| delete-impact | step 4 done (verify pending DB) | Pure utility passthrough; slim controller re-exports all from legacy; no service/DAL needed |
| auth | step 4 done (verify pending DB) | getMe refactored to service (Type E); login + refreshToken re-exported from legacy (Type D) |
| user | step 4 done (verify pending DB) | getUsers + getRoles refactored to service; all mutations re-exported from legacy; users.dal.js extended |
| dashboard | step 4 done (verify pending DB) | All Type C; SQL in queries/metrics.sql.js + queries/activities.sql.js; service + slim controller |
| product-group | step 4 done (verify pending DB) | getProductGroups Type A; getProductGroupOperations/getStageConfigs/exportProductGroups Type C; mutations Type D re-exported from legacy |
| product-inventory | step 4 done (verify pending DB) | getInventory Type C (correlated subquery); all mutations Type D re-exported from legacy |
| import-excel | step 4 done (verify pending DB) | All Type D (write-heavy); slim controller re-exports all from legacy; no service/DAL needed |
| production-planning | step 4 done (verify pending DB) | getProductionPlans Type C (complex multi-JOIN + batch-loaded days); SQL in queries/plans.sql.js; mutations Type D re-exported from legacy; no DAL/hydrator |
| outsourcing | step 4 done (verify pending DB) | exportDetailedItems Type C (CTE with multi-level aggregation); SQL in queries/outsourcing.sql.js; mutations Type D re-exported from legacy; no DAL/hydrator |
| daily-ticket | step 4 done (verify pending DB) | getTickets/getTicketById Type C (GROUP BY aggregates, STRING_AGG, correlated subquery); SQL in queries/daily-ticket.sql.js; approve/reject Type D via legacy repo write helpers; no DAL/hydrator |
| order | step 4 done (verify pending DB) | All reads Type C (5-CTE list, 6-CTE completion report, snapshot drift filter); SQL in queries/order.sql.js; createOrder/deleteOrder Type D via legacy repo; no DAL/hydrator |
