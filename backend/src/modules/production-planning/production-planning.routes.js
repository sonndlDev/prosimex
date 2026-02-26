import express from 'express'
import { getProductionPlans, createProductionPlan, updateProductionPlan, deleteProductionPlan } from './production-planning.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)

router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'planning'), getProductionPlans)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'planning'), createProductionPlan)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'planning'), updateProductionPlan)
router.delete('/:id', authorize(['ADMIN', 'PLANNER'], 'planning'), deleteProductionPlan)

export default router
