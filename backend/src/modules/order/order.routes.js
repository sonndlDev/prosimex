import express from 'express'
import { getOrders, createOrder, updateOrder, deleteOrder } from './order.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import authorizeRoles from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
// Assuming PLANNER is main manager of Orders, ADMIN can oversee
router.get('/', authorizeRoles('ADMIN', 'PLANNER', 'OPERATOR'), getOrders)
router.post('/', authorizeRoles('ADMIN', 'PLANNER'), createOrder)
router.put('/:id', authorizeRoles('ADMIN', 'PLANNER'), updateOrder)
router.delete('/:id', authorizeRoles('ADMIN'), deleteOrder)

export default router
