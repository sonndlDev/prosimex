import express from 'express'
import { getProductionPlans, createProductionPlan } from './production-planning.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import authorizeRoles from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
// PLANNER exclusively handles Planning
router.get('/', authorizeRoles('ADMIN', 'PLANNER', 'OPERATOR'), getProductionPlans)
router.post('/', authorizeRoles('ADMIN', 'PLANNER'), createProductionPlan)

export default router
