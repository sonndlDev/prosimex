import express from 'express'
import { getProductionPlans, createProductionPlan, updateProductionPlan, deleteProductionPlan, cloneProductionPlan, createOrderGeneralPlan, stopPlan } from './production-planning.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)

router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'planning'), getProductionPlans)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'planning'), createProductionPlan)
router.post('/batch-order', authorize(['ADMIN', 'PLANNER'], 'planning'), createOrderGeneralPlan)
router.post('/clone/:id', authorize(['ADMIN', 'PLANNER'], 'planning'), cloneProductionPlan)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'planning'), updateProductionPlan)
router.put('/:id/stop', authorize(['ADMIN', 'PLANNER'], 'planning'), stopPlan)
router.delete('/:id', authorize(['ADMIN', 'PLANNER'], 'planning'), deleteProductionPlan)

export default router
