import express from 'express'
import { getOrders, getOrderCompletionReport, createOrder, updateOrder, deleteOrder, updateWarehouseDetails } from './order.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)

router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'orders'), getOrders)
router.get('/:id/completion-report', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'orders'), getOrderCompletionReport)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'orders'), createOrder)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'orders'), updateOrder)
router.put('/:id/warehouse-details', authorize(['ADMIN', 'PLANNER'], 'orders'), updateWarehouseDetails)
router.delete('/:id', authorize(['ADMIN'], 'orders'), deleteOrder)

export default router
