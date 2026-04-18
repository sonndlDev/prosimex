import pool from './src/config/db.js';

async function migrate() {
  try {
    await pool.query(`ALTER TABLE outsourcing_ticket_items ADD COLUMN IF NOT EXISTS packing_specification TEXT`);
    console.log("Migration successful: added packing_specification to outsourcing_ticket_items");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

migrate();
