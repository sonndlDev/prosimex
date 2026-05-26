import pool from './backend/src/config/db.js';

async function migrate() {
  try {
    await pool.query('ALTER TABLE daily_production_tickets ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;');
    console.log("Migration successful");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    process.exit();
  }
}

migrate();
