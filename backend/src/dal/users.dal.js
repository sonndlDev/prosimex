import pool from '../config/db.js';

export async function getUsersByIds(ids) {
  if (!ids || ids.length === 0) return [];
  const { rows } = await pool.query(
    `SELECT id, full_name, username FROM users WHERE id = ANY($1::int[])`,
    [[...new Set(ids)]]
  );
  return rows;
}

export function buildUserMap(users) {
  return Object.fromEntries(users.map(u => [u.id, u]));
}

export function userDisplayName(user) {
  return user?.full_name || user?.username || null;
}
