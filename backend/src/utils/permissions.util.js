/** @param {unknown} perms */
export function toPermissionArray(perms) {
  if (!perms) return [];
  if (Array.isArray(perms)) return perms.filter((p) => typeof p === 'string');
  if (typeof perms === 'string') {
    try {
      const parsed = JSON.parse(perms);
      return Array.isArray(parsed) ? parsed.filter((p) => typeof p === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Expand legacy module-only keys (e.g. "orders") to "orders:read".
 * Normalize hyphenated module names to underscores.
 */
export function normalizePermissions(perms) {
  const arr = toPermissionArray(perms);
  const result = new Set();

  for (let raw of arr) {
    if (!raw || typeof raw !== 'string') continue;
    raw = raw.trim().replace(/-/g, '_');
    if (!raw.includes(':')) {
      // Legacy module-only grants: expand to CRUD (matches migrate_permissions.js)
      result.add(`${raw}:read`);
      result.add(`${raw}:create`);
      result.add(`${raw}:update`);
      result.add(`${raw}:delete`);
      if (raw === 'outsourcing') result.add(`${raw}:approve`);
      if (raw === 'daily_tickets') result.add(`${raw}:auto_approve`);
      continue;
    }
    result.add(raw);
  }

  return [...result];
}

/** Union role defaults + user-specific grants (user extras kept). */
export function mergeEffectivePermissions(userPerms, rolePerms) {
  const user = normalizePermissions(userPerms);
  const role = normalizePermissions(rolePerms);
  return [...new Set([...role, ...user])];
}
