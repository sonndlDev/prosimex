const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query('SELECT COUNT(*) FROM production_plans WHERE deleted_at IS NULL');
    console.log('Total non-deleted plans:', res.rows[0].count);
    
    const res2 = await pool.query(`
      SELECT COUNT(*) 
      FROM production_plans pp
      JOIN orders o ON pp.order_id = o.id
      WHERE pp.deleted_at IS NULL
    `);
    console.log('Plans with matching order:', res2.rows[0].count);

    const res3 = await pool.query('SELECT id, order_id, product_id FROM production_plans WHERE deleted_at IS NULL LIMIT 5');
    console.log('Sample plans:', res3.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
