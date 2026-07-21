-- Unified snapshot: captures product identity + group + stage config + operations when order becomes DONE
-- Protects completed orders from retroactive changes to master data

CREATE TABLE IF NOT EXISTS order_product_snapshots (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id),
    product_id INT NOT NULL REFERENCES products(id),
    -- Product identity
    product_name VARCHAR(255),
    -- Product group
    product_group_id INT,
    product_group_name VARCHAR(255),
    -- Stage config
    has_xi_ma BOOLEAN NOT NULL DEFAULT FALSE,
    has_dong_goi BOOLEAN NOT NULL DEFAULT FALSE,
    stage_count INT NOT NULL DEFAULT 0,
    -- Operations
    total_stages INT NOT NULL DEFAULT 0,
    final_pgo_id INT,
    start_pgo_id INT,
    final_op_name VARCHAR(255),
    operations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Customer (denormalized at product level for query simplicity)
    customer_name VARCHAR(255),
    -- Metadata
    snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_ops_order ON order_product_snapshots(order_id);
CREATE INDEX IF NOT EXISTS idx_ops_order_product ON order_product_snapshots(order_id, product_id);
