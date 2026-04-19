import pg from "pg";
const pool = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "prosimex",
  password: "admin",
  port: 5432,
});

async function run() {
  const res = await pool.query(`
    SELECT product_group_id, operation_id, sequence_order, dinh_muc
    FROM product_group_operations
    ORDER BY id ASC LIMIT 50
  `);
  console.log(res.rows);
  process.exit(0);
}
run();
