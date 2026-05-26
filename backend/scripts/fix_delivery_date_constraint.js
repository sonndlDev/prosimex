import pool from '../src/config/db.js';

async function fixSchema() {
    try {
        console.log('Altering orders table to make delivery_date nullable...');
        await pool.query('ALTER TABLE orders ALTER COLUMN delivery_date DROP NOT NULL');
        console.log('Successfully altered orders table.');
        process.exit(0);
    } catch (error) {
        console.error('Error altering table:', error);
        process.exit(1);
    }
}

fixSchema();
