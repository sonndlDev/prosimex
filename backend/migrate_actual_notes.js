import dotenv from "dotenv";
dotenv.config();
import pool from "./src/config/db.js";

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Adding actual_notes to daily_production_ticket_items...");
    await client.query(`
      ALTER TABLE daily_production_ticket_items
      ADD COLUMN IF NOT EXISTS actual_notes TEXT;
    `);
    console.log("Migration complete.");
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
