const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT o.id, o.order_code, o.received_date, o.delivery_date, 
             pp.id as plan_id, pp.planned_start_date, pp.planned_end_date
      FROM orders o
      LEFT JOIN production_plans pp ON o.id = pp.order_id
      WHERE o.deleted_at IS NULL
      ORDER BY o.created_at DESC
      LIMIT 10
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

run();
