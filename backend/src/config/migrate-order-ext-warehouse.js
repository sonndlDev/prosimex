import pg from "pg";
import dotenv from "dotenv";
import path from "path";

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables relative to this file (../../.env)
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
            ADD COLUMN IF NOT EXISTS expected_material_date DATE,
            ADD COLUMN IF NOT EXISTS actual_material_date DATE,
            ADD COLUMN IF NOT EXISTS net_weight_text TEXT,
            ADD COLUMN IF NOT EXISTS package_count_text TEXT,
            ADD COLUMN IF NOT EXISTS container_volume_text TEXT;
        `);
        
        console.log("Migration order_ext warehouse add columns successful!");
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
