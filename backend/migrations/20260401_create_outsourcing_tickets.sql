CREATE TABLE IF NOT EXISTS outsourcing_tickets (
    id SERIAL PRIMARY KEY,
    ticket_code VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'PLATING' or 'PACKAGING'
    order_id INT REFERENCES orders(id),
    product_id INT REFERENCES products(id),
    supplier VARCHAR(255),
    quantity_out NUMERIC(10, 2) NOT NULL DEFAULT 0,
    weight_out NUMERIC(10, 2),
    pieces_out NUMERIC(10, 2),
    expected_return_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS outsourcing_returns (
    id SERIAL PRIMARY KEY,
    ticket_id INT REFERENCES outsourcing_tickets(id) ON DELETE CASCADE,
    quantity_returned NUMERIC(10, 2) NOT NULL,
    returned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
