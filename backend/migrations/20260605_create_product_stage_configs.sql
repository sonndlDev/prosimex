CREATE TABLE product_stage_configs (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_group_id INTEGER NOT NULL REFERENCES product_groups(id),
    has_xi_ma BOOLEAN NOT NULL DEFAULT FALSE,
    has_dong_goi BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, product_group_id)
);

CREATE INDEX idx_psc_product_group ON product_stage_configs(product_group_id) WHERE updated_at IS NOT NULL;
CREATE INDEX idx_psc_product ON product_stage_configs(product_id);
