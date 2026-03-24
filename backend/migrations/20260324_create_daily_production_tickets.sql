-- 20260324_create_daily_production_tickets.sql

CREATE TABLE IF NOT EXISTS daily_production_tickets (
    id SERIAL PRIMARY KEY,
    ticket_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, COMPLETED
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS daily_production_ticket_items (
    id SERIAL PRIMARY KEY,
    ticket_id INT REFERENCES daily_production_tickets(id) ON DELETE CASCADE,
    order_id INT REFERENCES orders(id),
    product_id INT REFERENCES products(id),
    product_group_operation_id INT REFERENCES product_group_operations(id),
    operation_name VARCHAR(255), -- Denormalized name or ad-hoc operation name
    planned_quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    actual_quantity NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
