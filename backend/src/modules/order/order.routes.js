import express from 'express'
import { getOrders, createOrder, updateOrder, deleteOrder } from './order.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)

router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'orders'), getOrders)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'orders'), createOrder)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'orders'), updateOrder)
router.delete('/:id', authorize(['ADMIN'], 'orders'), deleteOrder)

export default router
