import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function run() {
  try {
    console.log("Adding sort_order column to machines table...");
    await pool.query(`ALTER TABLE machines ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;`);
    
    // Also check for factory_id uniqueness requirement if not already there
    console.log("Success.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}
run();
