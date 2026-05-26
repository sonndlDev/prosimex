import pool from '../src/config/db.js';

const migrate = async () => {
    try {
        await pool.query('ALTER TABLE factories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE');
        await pool.query('UPDATE factories SET is_active = TRUE WHERE is_active IS NULL');
        console.log('Successfully added and activated column is_active in factories');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
};

migrate();
