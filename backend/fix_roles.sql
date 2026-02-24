UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'ADMIN') WHERE role_id IS NULL;
