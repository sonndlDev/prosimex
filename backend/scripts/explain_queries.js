import dotenv from 'dotenv';
import pool from '../src/config/db.js';

dotenv.config();

/**
 * Lightweight EXPLAIN runner.
 * Usage:
 *   babel-node ./scripts/explain_queries.js dashboard
 *   babel-node ./scripts/explain_queries.js orders --factory_id=1 --limit=10 --offset=0
 *   babel-node ./scripts/explain_queries.js product-group-ops --product_group_id=1 --order_id=1 --product_id=1
 */

function parseArgs(argv) {
  const args = { _: [] };
  for (const raw of argv) {
    if (!raw) continue;
    if (raw.startsWith('--')) {
      const [k, ...rest] = raw.slice(2).split('=');
      args[k] = rest.length ? rest.join('=') : true;
    } else {
      args._.push(raw);
    }
  }
  return args;
}

async function explain({ label, sql, params }) {
  console.log(`\n=== ${label} ===`);
  const res = await pool.query(
    `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)\n${sql}`,
    params,
  );
  for (const row of res.rows) console.log(row['QUERY PLAN']);
}

async function runDashboard() {
  await explain({
    label: 'dashboard.ordersByStatus',
    sql: `
      SELECT status, COUNT(*) as count
      FROM orders
      WHERE deleted_at IS NULL
      GROUP BY status
    `,
    params: [],
  });

  await explain({
    label: 'dashboard.plansCount',
    sql: `
      SELECT COUNT(*)
      FROM production_plans
      WHERE status IN ('RUNNING', 'PLANNED') AND deleted_at IS NULL
    `,
    params: [],
  });

  await explain({
    label: 'dashboard.urgentOrders',
    sql: `
      SELECT 
        o.id, o.order_code, o.name, o.delivery_date, o.status,
        c.name as customer_name,
        EXTRACT(DAY FROM o.delivery_date - NOW()) as days_left
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.deleted_at IS NULL
        AND o.status NOT IN ('DONE', 'CANCELLED')
        AND o.delivery_date IS NOT NULL
        AND o.delivery_date <= NOW() + INTERVAL '7 days'
      ORDER BY o.delivery_date ASC
      LIMIT 8
    `,
    params: [],
  });

  await explain({
    label: 'dashboard.productionProgress',
    sql: `
      SELECT 
        o.id,
        o.order_code,
        o.name as order_name,
        c.name as customer_name,
        o.quantity as total_quantity,
        COALESCE(pq.completed_quantity, 0) as completed_quantity,
        o.delivery_date
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN (
        SELECT dti.order_id, SUM(dti.actual_quantity) as completed_quantity
        FROM daily_production_ticket_items dti
        JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
        WHERE dt.status = 'COMPLETED' AND dt.deleted_at IS NULL
        GROUP BY dti.order_id
      ) pq ON o.id = pq.order_id
      WHERE o.deleted_at IS NULL
        AND o.status = 'IN_PROGRESS'
      ORDER BY o.delivery_date ASC
      LIMIT 5
    `,
    params: [],
  });
}

async function runOrders(args) {
  const factory_id = args.factory_id || null;
  const search = args.search ? String(args.search) : '';
  const dateType = args.dateType ? String(args.dateType) : '';
  const startDate = args.startDate ? String(args.startDate) : '';
  const endDate = args.endDate ? String(args.endDate) : '';
  const limit = Number(args.limit || 10);
  const offset = Number(args.offset || 0);

  let whereClause = 'WHERE o.deleted_at IS NULL';
  const params = [];

  if (factory_id) {
    params.push(factory_id);
    whereClause += ` AND o.factory_id = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    whereClause += ` AND (o.name ILIKE $${params.length} OR o.order_code ILIKE $${params.length})`;
  }

  // JSONB date filter: this is typically the worst-case when data grows.
  if (startDate && endDate && (dateType === 'shipping' || dateType === 'container')) {
    // Normalized table: order_expected_dates (kind, expected_date)
    whereClause += ` AND EXISTS (
      SELECT 1
      FROM order_expected_dates oed
      WHERE oed.order_id = o.id
        AND oed.kind = $${params.length + 1}
        AND oed.expected_date >= $${params.length + 2}
        AND oed.expected_date <= $${params.length + 3}
    )`;
    params.push(dateType);
    params.push(startDate);
    params.push(endDate);
  }

  params.push(limit);
  params.push(offset);

  await explain({
    label: 'orders.list (count)',
    sql: `
      SELECT COUNT(*)
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN order_ext oe ON o.id = oe.order_id
      ${whereClause}
    `,
    params: params.slice(0, params.length - 2),
  });

  // Keep this to a minimal representative query (not the full API SQL) for plan insight.
  await explain({
    label: 'orders.list (page ids)',
    sql: `
      SELECT o.id
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN order_ext oe ON o.id = oe.order_id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params,
  });

  if (startDate && endDate && (dateType === 'shipping' || dateType === 'container')) {
    await explain({
      label: 'orders.jsonbDateFilter (count only)',
      sql: `
        SELECT COUNT(*)
        FROM orders o
        LEFT JOIN order_ext oe ON o.id = oe.order_id
        ${whereClause}
      `,
      params: params.slice(0, params.length - 2),
    });
  }
}

async function runProductGroupOps(args) {
  const product_group_id = args.product_group_id;
  const order_id = args.order_id;
  const product_id = args.product_id;

  if (!product_group_id) throw new Error('--product_group_id is required');

  if (order_id && product_id) {
    await explain({
      label: 'product-group-ops (with order/product)',
      sql: `
        SELECT pgo.id
        FROM product_group_operations pgo
        WHERE pgo.product_group_id = $1 AND pgo.deleted_at IS NULL
        ORDER BY pgo.sequence_order ASC
      `,
      params: [product_group_id],
    });

    await explain({
      label: 'product-group-ops planned+actual aggregates',
      sql: `
        WITH planned AS (
          SELECT product_group_operation_id
          FROM production_plans
          WHERE deleted_at IS NULL AND order_id = $1 AND product_id = $2
          GROUP BY product_group_operation_id
        ),
        actual AS (
          SELECT dti.product_group_operation_id, SUM(dti.actual_quantity) AS total_actual
          FROM daily_production_ticket_items dti
          JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
          WHERE dt.deleted_at IS NULL
            AND dti.order_id = $1
            AND dti.product_id = $2
          GROUP BY dti.product_group_operation_id
        )
        SELECT COUNT(*)
        FROM planned
        FULL JOIN actual USING (product_group_operation_id)
      `,
      params: [order_id, product_id],
    });
  } else {
    await explain({
      label: 'product-group-ops (base)',
      sql: `
        SELECT pgo.id
        FROM product_group_operations pgo
        WHERE pgo.product_group_id = $1 AND pgo.deleted_at IS NULL
        ORDER BY pgo.sequence_order ASC
      `,
      params: [product_group_id],
    });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args._[0];

  if (!mode) {
    console.error('Missing mode. Use: dashboard | orders | product-group-ops');
    process.exitCode = 2;
    return;
  }

  try {
    if (mode === 'dashboard') await runDashboard();
    else if (mode === 'orders') await runOrders(args);
    else if (mode === 'product-group-ops') await runProductGroupOps(args);
    else throw new Error(`Unknown mode: ${mode}`);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
