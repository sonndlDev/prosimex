const authorize = (allowedRoles = [], requiredPermission = null) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role_name) {
      return res.status(403).json({ message: 'Access denied: No role provided' })
    }

    const { role_name, permissions } = req.user;
    const userPermissions = Array.isArray(permissions) ? permissions : [];

    // 1. ADMIN always has access
    if (role_name === 'ADMIN') return next();

    // 2. Check if user has an allowed role
    if (allowedRoles.length > 0 && allowedRoles.includes(role_name)) {
      return next();
    }

    // 3. Check if user has the specific required permission
    if (requiredPermission && userPermissions.includes(requiredPermission)) {
      return next();
    }

    return res.status(403).json({ message: 'Access denied: You do not have permission' })
  }
}

// Legacy wrapper for existing code
const authorizeRoles = (...roles) => authorize(roles);

export { authorize };
export default authorizeRoles;
