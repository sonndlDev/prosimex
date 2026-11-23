import express from 'express'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'
import { getRules, createRule, updateRuleStatus, deleteRule } from './auto-ticket-schedule.controller.js'

const router = express.Router()

// Chỉ tài khoản có username "admin" được truy cập module này, không phụ thuộc quyền được cấp
const requireAdmin = (req, res, next) => {
  if (req.user?.role_name === 'ADMIN' && req.user?.username === 'admin') return next()
  return res.status(403).json({ message: 'Chỉ tài khoản admin mới được truy cập' })
}

router.use(verifyToken, requireAdmin)

router.get('/', authorize([], 'auto_ticket_schedule:read'), getRules)
router.post('/', authorize([], 'auto_ticket_schedule:create'), createRule)
router.patch('/:id/status', authorize([], 'auto_ticket_schedule:update'), updateRuleStatus)
router.delete('/:id', authorize([], 'auto_ticket_schedule:delete'), deleteRule)

export default router
