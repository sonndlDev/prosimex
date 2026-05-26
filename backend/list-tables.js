import pool from './src/config/db.js';

pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
  .then(res => {
    console.log(JSON.stringify(res.rows.map(r => r.table_name)));
    pool.end();
  })
  .catch(console.error);
