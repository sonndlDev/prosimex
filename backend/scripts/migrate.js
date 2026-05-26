import pool from '../src/config/db.js';
import fs from 'fs';
import path from 'path';

/**
 * Migration Runner
 * Usage: npx babel-node scripts/migrate.js <path_to_sql_file>
 */

const filePath = process.argv[2];

if (!filePath) {
    console.error('Error: Please provide the path to the SQL migration file.');
    console.error('Usage: npx babel-node scripts/migrate.js migrations/your_file.sql');
    process.exit(1);
}

async function runMigration() {
    try {
        const absolutePath = path.resolve(filePath);
        if (!fs.existsSync(absolutePath)) {
            console.error(`Error: File not found at ${absolutePath}`);
            process.exit(1);
        }

        const sql = fs.readFileSync(absolutePath, 'utf8');
        console.log(`Running migration: ${path.basename(filePath)}...`);
        
        await pool.query(sql);
        
        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
