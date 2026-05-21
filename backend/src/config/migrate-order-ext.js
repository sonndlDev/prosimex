import pool from "./db.js";

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // Create the extension table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_ext (
        order_id INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
        production_start_date DATE,
        expected_shipping_date JSONB DEFAULT '[]'::jsonb,
        expected_container_shipping_date JSONB DEFAULT '[]'::jsonb,
        customer_confirmation_result TEXT
      );
    `);

    await client.query("COMMIT");
    console.log("Migration successful: created order_ext table");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
