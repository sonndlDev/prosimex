import dotenv from "dotenv";
import path from "path";
dotenv.config();
import pool from "./src/config/db.js";

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Adding production_plan_id to daily_production_ticket_items...");
    await client.query(`
      ALTER TABLE daily_production_ticket_items 
      ADD COLUMN IF NOT EXISTS production_plan_id INTEGER;
    `);
    
    console.log("Adding index for production_plan_id...");
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_dti_production_plan_id 
      ON daily_production_ticket_items(production_plan_id);
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
