import pool from './src/config/db.js';

async function run() {
  try {
    const res = await pool.query(`
      SELECT a.*, u.username 
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.action = 'IMPORT' 
      ORDER BY a.created_at DESC 
      LIMIT 10
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
