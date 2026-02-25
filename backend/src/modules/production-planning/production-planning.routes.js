import express from 'express'
import { getProductionPlans, createProductionPlan, updateProductionPlan, deleteProductionPlan } from './production-planning.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import authorizeRoles from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
// PLANNER exclusively handles Planning
router.get('/', authorizeRoles('ADMIN', 'PLANNER', 'OPERATOR'), getProductionPlans)
router.post('/', authorizeRoles('ADMIN', 'PLANNER'), createProductionPlan)
router.put('/:id', authorizeRoles('ADMIN', 'PLANNER'), updateProductionPlan)
router.delete('/:id', authorizeRoles('ADMIN', 'PLANNER'), deleteProductionPlan)

export default router
