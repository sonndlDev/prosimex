import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import pool from "./src/config/db.js";

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Starting permission migration...");
    
    // Fetch all users
    const result = await client.query(`SELECT id, permissions FROM users`);
    const users = result.rows;
    
    for (const user of users) {
      if (!Array.isArray(user.permissions)) continue;
      
      let newPermissions = new Set();
      
      for (const p of user.permissions) {
        // If it already has a colon, it's already fine-grained or special, just keep it
        if (p.includes(':')) {
          newPermissions.add(p);
          continue;
        }
        
        // Convert old permission to CRUD
        newPermissions.add(`${p}:read`);
        newPermissions.add(`${p}:create`);
        newPermissions.add(`${p}:update`);
        newPermissions.add(`${p}:delete`);
        
        // Special case for outsourcing
        if (p === 'outsourcing') {
            newPermissions.add(`${p}:approve`);
        }
      }
      
      const newPermsArray = Array.from(newPermissions);
      
      await client.query(
        `UPDATE users SET permissions = $1 WHERE id = $2`,
        [JSON.stringify(newPermsArray), user.id]
      );
    }
    
    console.log(`Migration complete. Updated ${users.length} users.`);
  } catch (e) {
    console.error("Migration failed:", e);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
