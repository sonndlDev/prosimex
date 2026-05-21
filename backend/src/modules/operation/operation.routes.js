import express from 'express'
import { getOperations, createOperation, updateOperation, deleteOperation } from './operation.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
// Assuming PLANNER sets up global operations mapping
router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'operations:read'), getOperations)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'operations:create'), createOperation)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'operations:update'), updateOperation)
router.delete('/:id', authorize(['ADMIN'], 'operations:delete'), deleteOperation)

export default router
