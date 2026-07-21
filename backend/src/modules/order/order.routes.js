import express from 'express'
import { getOrders, getOrderCompletionReport, getOrderSummaryReport, createOrder, updateOrder, deleteOrder, updateWarehouseDetails, getOrderProductSnapshots } from './order.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)

router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'orders:read'), getOrders)
router.get('/product-snapshots', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'orders:read'), getOrderProductSnapshots)
router.get('/:id/completion-report', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'orders:read'), getOrderCompletionReport)
router.get('/:id/summary-report', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'orders:read'), getOrderSummaryReport)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'orders:create'), createOrder)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'orders:update'), updateOrder)
router.put('/:id/warehouse-details', authorize(['ADMIN', 'PLANNER'], 'orders:update'), updateWarehouseDetails)
router.delete('/:id', authorize(['ADMIN'], 'orders:delete'), deleteOrder)

export default router
