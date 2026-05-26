import pool from "./db.js";

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Alter expected_shipping_date and expected_container_shipping_date to JSONB
    // We convert the existing single date into an array of strings (e.g. ["2024-05-20"])
    
    await client.query(`
      ALTER TABLE order_ext
      ALTER COLUMN expected_shipping_date TYPE JSONB USING (
        CASE 
          WHEN expected_shipping_date IS NOT NULL THEN jsonb_build_array(expected_shipping_date)
          ELSE '[]'::jsonb 
        END
      ),
      ALTER COLUMN expected_container_shipping_date TYPE JSONB USING (
        CASE 
          WHEN expected_container_shipping_date IS NOT NULL THEN jsonb_build_array(expected_container_shipping_date)
          ELSE '[]'::jsonb 
        END
      );
    `);

    // Set default value for future inserts just in case, though they are usually handled by code
    await client.query(`
      ALTER TABLE order_ext
      ALTER COLUMN expected_shipping_date SET DEFAULT '[]'::jsonb,
      ALTER COLUMN expected_container_shipping_date SET DEFAULT '[]'::jsonb;
    `);

    await client.query("COMMIT");
    console.log("Migration successful: altered order_ext columns to JSONB");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
