import jwt from 'jsonwebtoken'

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  if (!authHeader) return res.status(403).json({ message: 'Token is required' })

  const token = authHeader.split(' ')[1]
  if (!token) return res.status(403).json({ message: 'Token format is invalid' })

  jwt.verify(token, process.env.JWT_SECRET || 'secretKey', (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Unauthorized, token failed' })
    req.user = decoded // { id, username, role_name, factory_id }
    next()
  })
}

export default verifyToken
