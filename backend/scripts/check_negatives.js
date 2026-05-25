import pool from '../src/config/db.js';
async function run() {
  const res = await pool.query('SELECT production_plan_id, working_date, planned_work_quantity FROM production_plan_days WHERE planned_work_quantity < 0');
  console.log(res.rows);
  await pool.end();
}
run();
