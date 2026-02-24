import express from 'express'
import { getFactories, createFactory, updateFactory, deleteFactory } from './factory.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import authorizeRoles from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
// Assuming ADMIN can manage factories. Add more generic roles if needed.
router.get('/', authorizeRoles('ADMIN', 'PLANNER'), getFactories)
router.post('/', authorizeRoles('ADMIN'), createFactory)
router.put('/:id', authorizeRoles('ADMIN'), updateFactory)
router.delete('/:id', authorizeRoles('ADMIN'), deleteFactory)

export default router
