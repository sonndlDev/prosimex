const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role_name) {
      return res.status(403).json({ message: 'Access denied: No role provided' })
    }

    if (allowedRoles.includes(req.user.role_name)) {
      next()
    } else {
      return res.status(403).json({ message: 'Access denied: You do not have permission' })
    }
  }
}

export default authorizeRoles
