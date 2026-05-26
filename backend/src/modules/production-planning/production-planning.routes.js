import express from 'express'
import { getProductionPlans, createProductionPlan, updateProductionPlan, deleteProductionPlan, cloneProductionPlan, createOrderGeneralPlan, stopPlan, getPlannedStatusByOrder } from './production-planning.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)

router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'planning:read'), getProductionPlans)
router.get('/planned-status', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'planning:read'), getPlannedStatusByOrder)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'planning:create'), createProductionPlan)
router.post('/batch-order', authorize(['ADMIN', 'PLANNER'], 'planning:create'), createOrderGeneralPlan)
router.post('/clone/:id', authorize(['ADMIN', 'PLANNER'], 'planning:create'), cloneProductionPlan)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'planning:update'), updateProductionPlan)
router.put('/:id/stop', authorize(['ADMIN', 'PLANNER'], 'planning:update'), stopPlan)
router.delete('/:id', authorize(['ADMIN', 'PLANNER'], 'planning:delete'), deleteProductionPlan)

export default router
