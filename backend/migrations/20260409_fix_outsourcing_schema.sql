-- Drop existing tables to recreate schema (Data will be lost, as approved for dev environment)
DROP TABLE IF EXISTS outsourcing_returns CASCADE;
DROP TABLE IF EXISTS outsourcing_tickets CASCADE;

-- 1. Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 2. Create outsourcing_tickets (Master)
CREATE TABLE IF NOT EXISTS outsourcing_tickets (
    id SERIAL PRIMARY KEY,
    ticket_code VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'PLATING' or 'PACKAGING'
    supplier_id INT REFERENCES suppliers(id),
    dispatch_date DATE,
    expected_return_date DATE,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_by INT REFERENCES users(id),
    modified_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- 3. Create outsourcing_ticket_items (Details)
CREATE TABLE IF NOT EXISTS outsourcing_ticket_items (
    id SERIAL PRIMARY KEY,
    ticket_id INT REFERENCES outsourcing_tickets(id) ON DELETE CASCADE,
    order_id INT REFERENCES orders(id),
    product_id INT REFERENCES products(id),
    order_quantity NUMERIC(15, 2) DEFAULT 0,
    processing_type VARCHAR(100), -- xi, mạ, sơn, ly tâm...
    quantity_out NUMERIC(15, 2) NOT NULL DEFAULT 0,
    gross_weight NUMERIC(10, 2),
    pallet_weight NUMERIC(10, 2),
    net_weight NUMERIC(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Recreate outsourcing_returns linked to items
CREATE TABLE IF NOT EXISTS outsourcing_returns (
    id SERIAL PRIMARY KEY,
    ticket_item_id INT REFERENCES outsourcing_ticket_items(id) ON DELETE CASCADE,
    quantity_returned NUMERIC(15, 2) NOT NULL,
    returned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
