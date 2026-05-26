-- ==========================================
-- 1. USER & AUTH MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- ==========================================
-- 2. FACTORY MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS factories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);


CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT REFERENCES roles(id),
    factory_id INT REFERENCES factories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ==========================================
-- 3. MACHINE MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS machines (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    factory_id INT REFERENCES factories(id),
    capacity_per_day NUMERIC(10, 2) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE (factory_id, code)
);

-- ==========================================
-- 4. OPERATION MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS operations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ==========================================
-- 5. PRODUCT GROUP MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS product_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    factory_id INT REFERENCES factories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_group_operations (
    id SERIAL PRIMARY KEY,
    product_group_id INT REFERENCES product_groups(id) ON DELETE CASCADE,
    operation_id INT REFERENCES operations(id),
    machine_id INT REFERENCES machines(id),
    sequence_order INT NOT NULL,
    dinh_muc NUMERIC(10, 2) NOT NULL,
    estimated_hours NUMERIC(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ==========================================
-- 6. PRODUCT MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    product_group_id INT REFERENCES product_groups(id),
    factory_id INT REFERENCES factories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ==========================================
-- 7. CUSTOMER MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ==========================================
-- 8. ORDER MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    customer_id INT REFERENCES customers(id),
    product_id INT REFERENCES products(id),
    po_customer VARCHAR(255) NOT NULL,
    po_auto_code VARCHAR(255),
    received_date TIMESTAMP NOT NULL,
    delivery_date TIMESTAMP NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    production_location TEXT,
    person_in_charge VARCHAR(255),
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, PLANNED, IN_PROGRESS, DONE, CANCELLED
    factory_id INT REFERENCES factories(id),
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ==========================================
-- 10. PRODUCTION PLANNING MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS production_plans (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    product_group_operation_id INT REFERENCES product_group_operations(id),
    inventory_input NUMERIC(10, 2) NOT NULL,
    remaining_quantity NUMERIC(10, 2) NOT NULL,
    total_required_work NUMERIC(10, 2) NOT NULL,
    planned_start_date TIMESTAMP NOT NULL,
    planned_end_date TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'PLANNED', -- PLANNED, RUNNING, DONE
    created_by INT REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS production_plan_days (
    id SERIAL PRIMARY KEY,
    production_plan_id INT REFERENCES production_plans(id) ON DELETE CASCADE,
    working_date TIMESTAMP NOT NULL,
    planned_work_quantity NUMERIC(10, 2) NOT NULL,
    is_overtime BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ==========================================
-- 9. MACHINE SCHEDULE MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS machine_schedules (
    id SERIAL PRIMARY KEY,
    machine_id INT REFERENCES machines(id),
    order_id INT REFERENCES orders(id),
    production_plan_id INT REFERENCES production_plans(id),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ==========================================
-- AUDIT LOG MODULE
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id INT NOT NULL,
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seeding Default Roles
INSERT INTO roles (name) VALUES ('ADMIN'), ('PLANNER'), ('OPERATOR') ON CONFLICT DO NOTHING;
