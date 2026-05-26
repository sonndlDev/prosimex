-- Store default permissions per role (merged with user.permissions at login)
ALTER TABLE roles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]';

-- Seed sensible defaults for system roles (idempotent via name)
UPDATE roles SET permissions = '[
  "dashboard:read","planning:read","planning:create","planning:update","planning:delete",
  "daily_tickets:read","daily_tickets:create","daily_tickets:update","daily_tickets:delete","daily_tickets:auto_approve",
  "import_excel:read","import_excel:create","production_output:read","production_output:create","production_output:update","production_output:delete",
  "schedule:read","outsourcing:read","outsourcing:create","outsourcing:update","outsourcing:delete",
  "orders:read","orders:create","orders:update","warehouse:read","warehouse:create","warehouse:update",
  "product_inventory:read","plan_vs_actual:read",
  "customers:read","customers:create","customers:update","factories:read","machines:read","machines:create","machines:update",
  "operations:read","operations:create","operations:update","suppliers:read","suppliers:create","suppliers:update",
  "product_groups:read","product_groups:create","product_groups:update","products:read","products:create","products:update"
]'::jsonb
WHERE name = 'PLANNER' AND (permissions IS NULL OR permissions = '[]'::jsonb);

UPDATE roles SET permissions = '[
  "dashboard:read","daily_tickets:read","daily_tickets:create","daily_tickets:update",
  "production_output:read","production_output:create","schedule:read",
  "orders:read","warehouse:read","product_inventory:read",
  "factories:read","machines:read","operations:read","product_groups:read","products:read"
]'::jsonb
WHERE name = 'OPERATOR' AND (permissions IS NULL OR permissions = '[]'::jsonb);

UPDATE roles SET permissions = '[
  "dashboard:read","daily_tickets:read","daily_tickets:update","production_output:read",
  "orders:read","warehouse:read","product_inventory:read","plan_vs_actual:read"
]'::jsonb
WHERE name = 'MANAGER' AND (permissions IS NULL OR permissions = '[]'::jsonb);
