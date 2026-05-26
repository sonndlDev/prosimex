import pool from './db.js';

const tables = [
  'factories',
  'machines',
  'product_groups',
  'products',
  'customers',
  'orders',
  'workers',
  'production_plans',
  'outsourcing_tickets',
  'daily_production_tickets',
  'operations',
  'users',
  'order_products'
];

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const table of tables) {
      console.log(`Processing table: ${table}`);
      try {
        await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS created_by INT REFERENCES users(id) ON DELETE SET NULL`);
        await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
        await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS modified_by INT REFERENCES users(id) ON DELETE SET NULL`);
        await client.query(`ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS modified_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
      } catch (err) {
        console.warn(`Error on table ${table}: ${err.message}`);
      }
    }
    
    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
