import express from 'express'
import { getOperations, createOperation, updateOperation, deleteOperation } from './operation.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
// Assuming PLANNER sets up global operations mapping
router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'operations'), getOperations)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'operations'), createOperation)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'operations'), updateOperation)
router.delete('/:id', authorize(['ADMIN'], 'operations'), deleteOperation)

export default router
