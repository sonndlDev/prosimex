import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Pool sizing
  max: 20, // max connections in pool
  min: 2, // keep at least 2 idle connections ready
  // Timeouts
  idleTimeoutMillis: 30000, // close idle connections after 30s
  connectionTimeoutMillis: 5000, // fail if can't connect within 5s
  // TCP keepalive — prevents VPS/firewall from killing idle connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000, // send keepalive probe after 10s idle
});

pool.on("connect", (client) => {
  client.query("SET timezone = 'Asia/Ho_Chi_Minh'");
});

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
});

// Verify pool connectivity on startup
pool
  .query("SELECT NOW()")
  .then(() => {
    console.log("✅ PostgreSQL pool connected successfully");
  })
  .catch((err) => {
    console.error("❌ PostgreSQL pool connection failed:", err.message);
  });

export default pool;
