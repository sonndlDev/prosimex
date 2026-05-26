# Database Migrations

To set up the database in a new environment (like production), please run the following files in the specified order using the migration tool.

## Initial Setup
1. `init.sql`: Base schema and initial data.

## Feature Extensions
2. `20260226_add_order_products.sql`: Multi-product support for orders.
3. `20260226_add_attendance.sql`: Attendance system tables.
4. `20260226_fix_attendance_tz.sql`: Timezone fixes for attendance.

## How to run
From the `backend` directory:
```bash
npm run db:migrate migrations/filename.sql
```
