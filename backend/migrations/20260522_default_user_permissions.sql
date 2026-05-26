UPDATE roles SET permissions = '["dashboard:read"]'::jsonb
WHERE name = 'DEFAULT_USER' AND (permissions IS NULL OR permissions = '[]'::jsonb);
