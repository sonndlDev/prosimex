import pool from './src/config/db.js';

async function checkCols(tableName) {
    try {
        const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1", [tableName]);
        console.log(`Table: ${tableName}`);
        console.log(res.rows.map(r => `${r.column_name} (${r.data_type})`));
        console.log('---');
    } catch (e) {
        console.error(`Error checking ${tableName}:`, e.message);
    }
}

(async () => {
    await checkCols('customers');
    await checkCols('product_groups');
    await checkCols('operations');
    await checkCols('products');
    await checkCols('product_group_operations');
    await checkCols('factories');
    await checkCols('audit_logs');
    process.exit(0);
})();
