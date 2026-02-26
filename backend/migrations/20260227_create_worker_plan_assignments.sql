-- Migration: Add Worker Plan Assignments
CREATE TABLE IF NOT EXISTS worker_plan_assignments (
    id SERIAL PRIMARY KEY,
    worker_id INT REFERENCES workers(id) ON DELETE CASCADE,
    production_plan_id INT REFERENCES production_plans(id) ON DELETE CASCADE,
    working_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (worker_id, production_plan_id, working_date)
);

CREATE INDEX IF NOT EXISTS idx_worker_plan_assignments_plan_date ON worker_plan_assignments(production_plan_id, working_date);
