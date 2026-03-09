import pool from './src/config/db.js';
(async () => {
    try {
        const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'production_plans'");
        console.log(res.rows.map(r => r.column_name));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
})();
