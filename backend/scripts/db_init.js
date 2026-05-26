import fs from 'fs';
import path from 'path';
import pool from '../src/config/db.js';

const initDb = async () => {
    try {
        const sqlPath = path.join(process.cwd(), 'migrations', 'init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        console.log('Running Database Initialization Script...');
        await pool.query(sql);
        console.log('Database Initialization Successful!');
    } catch (err) {
        console.error('Error Initializing Database:', err);
    } finally {
        await pool.end();
    }
};

initDb();
