import bcrypt from 'bcrypt';
import pool from '../src/config/db.js';

const seedSampleData = async () => {
    try {
        console.log('--- Starting Sample Data Seeding ---');

        // 1. Roles (Already handled by init.sql usually, but ensuring)
        const adminRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'ADMIN'");
        const plannerRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'PLANNER'");
        const operatorRoleRes = await pool.query("SELECT id FROM roles WHERE name = 'OPERATOR'");
        
        const adminRoleId = adminRoleRes.rows[0]?.id;
        const plannerRoleId = plannerRoleRes.rows[0]?.id;
        const operatorRoleId = operatorRoleRes.rows[0]?.id;

        // 2. Factories
        console.log('Seeding Factories...');
        const factoryRes = await pool.query(
            "INSERT INTO factories (name, location) VALUES ($1, $2) RETURNING id",
            ['Prosimex Main Factory', 'Hanoi, Vietnam']
        );
        const factoryId = factoryRes.rows[0].id;

        // 3. Machines
        console.log('Seeding Machines...');
        const machineNames = [
            { name: 'Cutting Machine 01', code: 'CUT-01', cap: 100 },
            { name: 'Sewing Machine A1', code: 'SEW-A1', cap: 50 },
            { name: 'Packing Line 1', code: 'PKG-01', cap: 200 }
        ];
        const machineIds = {};
        for (const m of machineNames) {
            const res = await pool.query(
                "INSERT INTO machines (code, name, factory_id, capacity_per_day) VALUES ($1, $2, $3, $4) RETURNING id",
                [m.code, m.name, factoryId, m.cap]
            );
            machineIds[m.code] = res.rows[0].id;
        }

        // 4. Operations
        console.log('Seeding Operations...');
        const ops = ['Cutting', 'Sewing', 'QC & Packing'];
        const opIds = {};
        for (const opName of ops) {
            const res = await pool.query(
                "INSERT INTO operations (name, description) VALUES ($1, $2) RETURNING id",
                [opName, `${opName} process step`]
            );
            opIds[opName] = res.rows[0].id;
        }

        // 5. Product Groups & Routings
        console.log('Seeding Product Groups & Routings...');
        const pgRes = await pool.query(
            "INSERT INTO product_groups (name, factory_id) VALUES ($1, $2) RETURNING id",
            ['T-Shirt Standard', factoryId]
        );
        const pgId = pgRes.rows[0].id;

        // Routing: Cutting -> Sewing -> Packing
        const routing = [
            { op: 'Cutting', machine: 'CUT-01', seq: 1, dm: 120, est: 8 },
            { op: 'Sewing', machine: 'SEW-A1', seq: 2, dm: 40, est: 24 },
            { op: 'QC & Packing', machine: 'PKG-01', seq: 3, dm: 300, est: 4 }
        ];
        for (const r of routing) {
            await pool.query(
                "INSERT INTO product_group_operations (product_group_id, operation_id, machine_id, sequence_order, dinh_muc, estimated_hours) VALUES ($1, $2, $3, $4, $5, $6)",
                [pgId, opIds[r.op], machineIds[r.machine], r.seq, r.dm, r.est]
            );
        }

        // 6. Products
        console.log('Seeding Products...');
        const prodRes = await pool.query(
            "INSERT INTO products (name, product_group_id, factory_id) VALUES ($1, $2, $3) RETURNING id",
            ['Basic White T-Shirt (M)', pgId, factoryId]
        );
        const productId = prodRes.rows[0].id;

        // 7. Customers
        console.log('Seeding Customers...');
        const custRes = await pool.query(
            "INSERT INTO customers (code, name, address) VALUES ($1, $2, $3) RETURNING id",
            ['CUST-001', 'Global Fashion Retail', 'Singapore']
        );
        const customerId = custRes.rows[0].id;

        // 8. Orders
        console.log('Seeding Orders...');
        const orderRes = await pool.query(
            `INSERT INTO orders 
            (order_code, name, customer_id, product_id, po_customer, received_date, delivery_date, quantity, status, factory_id) 
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '14 days', $6, $7, $8) RETURNING id`,
            ['ORD-2024-001', 'Order for Summer Collection', customerId, productId, 'PO-998877', 1000, 'DRAFT', factoryId]
        );

        console.log('--- Sample Data Seeded Successfully! ---');
        console.log('You can now use Order ORD-2024-001 in the Planning module.');

    } catch (err) {
        console.error('Error seeding sample data:', err);
    } finally {
        await pool.end();
    }
};

seedSampleData();
