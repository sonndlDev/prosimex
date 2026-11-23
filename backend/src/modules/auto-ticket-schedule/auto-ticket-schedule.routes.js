import express from 'express'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'
import { getRules, createRule, updateRuleStatus, deleteRule } from './auto-ticket-schedule.controller.js'

const router = express.Router()

router.use(verifyToken)

router.get('/', authorize([], 'auto_ticket_schedule:read'), getRules)
router.post('/', authorize([], 'auto_ticket_schedule:create'), createRule)
router.patch('/:id/status', authorize([], 'auto_ticket_schedule:update'), updateRuleStatus)
router.delete('/:id', authorize([], 'auto_ticket_schedule:delete'), deleteRule)

export default router
