import bcrypt from 'bcrypt';
import pool from '../src/config/db.js';

const seedAdmin = async () => {
    try {
        // Ensure role exists
        const roleRes = await pool.query("SELECT id FROM roles WHERE name = 'ADMIN'");
        let adminRoleId;
        
        if (roleRes.rows.length === 0) {
            const newRole = await pool.query("INSERT INTO roles (name) VALUES ('ADMIN') RETURNING id");
            adminRoleId = newRole.rows[0].id;
        } else {
            adminRoleId = roleRes.rows[0].id;
        }

        const username = 'admin';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const userCheck = await pool.query("SELECT id FROM users WHERE username = $1", [username]);
        
        if (userCheck.rows.length === 0) {
            await pool.query(
                "INSERT INTO users (username, password_hash, role_id, is_active) VALUES ($1, $2, $3, true)",
                [username, hashedPassword, adminRoleId]
            );
            console.log('Admin user created successfully!');
            console.log('Username: admin');
            console.log('Password: admin123');
        } else {
            console.log('Admin user already exists.');
        }

    } catch (err) {
        console.error('Error seeding admin:', err);
    } finally {
        await pool.end();
    }
};

seedAdmin();
