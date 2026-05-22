import { normalizePermissions } from '../utils/permissions.util.js';

/** System roles listed in allowedRoles keep legacy bypass (reduces breakage after deploy). */
const LEGACY_BYPASS_ROLES = ['PLANNER', 'OPERATOR'];

const authorize = (allowedRoles = [], requiredPermission = null) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role_name) {
      return res.status(403).json({ message: 'Access denied: No role provided' })
    }

    const { role_name, permissions } = req.user;
    const userPermissions = normalizePermissions(permissions);

    // 1. ADMIN always has access
    if (role_name === 'ADMIN') return next();

    // 2. Legacy: PLANNER/OPERATOR on routes that explicitly allow them
    if (
      requiredPermission &&
      allowedRoles.length > 0 &&
      LEGACY_BYPASS_ROLES.includes(role_name) &&
      allowedRoles.includes(role_name)
    ) {
      return next();
    }

    // 3. When a permission is required, check merged JWT permissions
    if (requiredPermission) {
      // If requiredPermission is an array (e.g., ['orders:read', 'orders:create'])
      // then user must have AT LEAST ONE of them to pass (or ALL? Usually ANY is sufficient for a combined route, but let's see. 
      // Actually, if we want them to have ALL, use every. If we want ANY, use some.
      // A route usually requires just one permission, e.g., 'orders:read'
      
      const permsToCheck = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
      
      // We'll check if the user has ANY of the required permissions.
      // If a route needs them to have ALL, it would be a different use case, but usually a single string is passed.
      const hasPermission = permsToCheck.some(p => userPermissions.includes(p));
      
      if (hasPermission) {
        return next();
      }

      const requiredLabel = Array.isArray(requiredPermission)
        ? requiredPermission.join(', ')
        : requiredPermission;
      return res.status(403).json({
        message: 'Access denied: You do not have permission',
        required_permission: requiredLabel || null,
      });
    }

    // 4. Routes without requiredPermission may fall back to allowedRoles
    if (allowedRoles.length > 0 && allowedRoles.includes(role_name)) {
      return next();
    }

    const requiredLabel = Array.isArray(requiredPermission)
      ? requiredPermission.join(', ')
      : (requiredPermission || '');
    return res.status(403).json({
      message: 'Access denied: You do not have permission',
      required_permission: requiredLabel || null,
    })
  }
}

// Legacy wrapper for existing code
const authorizeRoles = (...roles) => authorize(roles);

export { authorize };
export default authorizeRoles;
