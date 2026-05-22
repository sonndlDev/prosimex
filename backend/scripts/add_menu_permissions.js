import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import pool from '../src/config/db.js';

function addMenuFromRead(permissions) {
  const arr = Array.isArray(permissions) ? permissions : [];
  const next = new Set(arr);
  for (const p of arr) {
    if (typeof p === 'string' && p.endsWith(':read')) {
      next.add(p.replace(/:read$/, ':menu'));
    }
  }
  return [...next];
}

async function run() {
  const client = await pool.connect();
  try {
    for (const table of ['roles', 'users']) {
      const { rows } = await client.query(
        `SELECT id, permissions FROM ${table} WHERE permissions IS NOT NULL`
      );
      for (const row of rows) {
        const updated = addMenuFromRead(row.permissions);
        if (updated.length === (row.permissions?.length || 0)) continue;
        await client.query(`UPDATE ${table} SET permissions = $1 WHERE id = $2`, [
          JSON.stringify(updated),
          row.id,
        ]);
      }
      console.log(`Updated ${table}: ${rows.length} rows processed`);
    }
    console.log('Menu permissions added successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
