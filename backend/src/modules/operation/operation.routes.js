import express from 'express'
import { getOperations, createOperation, updateOperation, deleteOperation } from './operation.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import authorizeRoles from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
// Assuming PLANNER sets up global operations mapping
router.get('/', authorizeRoles('ADMIN', 'PLANNER', 'OPERATOR'), getOperations)
router.post('/', authorizeRoles('ADMIN', 'PLANNER'), createOperation)
router.put('/:id', authorizeRoles('ADMIN', 'PLANNER'), updateOperation)
router.delete('/:id', authorizeRoles('ADMIN'), deleteOperation)

export default router
