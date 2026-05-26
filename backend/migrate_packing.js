import pool from './src/config/db.js';

async function migrate() {
  try {
    await pool.query(`ALTER TABLE order_ext ADD COLUMN IF NOT EXISTS packing_specification TEXT`);
    console.log("Migration successful: added packing_specification to order_ext");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

migrate();
