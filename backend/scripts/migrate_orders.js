import pool from '../src/config/db.js';

const migrate = async () => {
    try {
        await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS note TEXT');
        console.log('Successfully added column note to table orders');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
};

migrate();
