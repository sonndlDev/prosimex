import pg from "pg";
import dotenv from "dotenv";
import path from "path";

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        await client.query(`
            ALTER TABLE order_ext
            ADD COLUMN IF NOT EXISTS pallet_info TEXT,
            ADD COLUMN IF NOT EXISTS accessory_status TEXT,
            ADD COLUMN IF NOT EXISTS packaging_spec TEXT;
        `);
        
        console.log("Migration order_ext add pallet_info & accessory_condition successful!");
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Migration error:", error);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
