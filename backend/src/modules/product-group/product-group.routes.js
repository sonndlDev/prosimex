import express from 'express'
import {
  getProductGroups, createProductGroup, updateProductGroup, deleteProductGroup,
  getProductGroupOperations, createProductGroupOperation, deleteProductGroupOperation
} from './product-group.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import authorizeRoles from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
// Assuming PLANNER manages product groups
router.get('/', authorizeRoles('ADMIN', 'PLANNER', 'OPERATOR'), getProductGroups)
router.post('/', authorizeRoles('ADMIN', 'PLANNER'), createProductGroup)
router.put('/:id', authorizeRoles('ADMIN', 'PLANNER'), updateProductGroup)
router.delete('/:id', authorizeRoles('ADMIN'), deleteProductGroup)

// Nested Operations Routes for a specific Product Group
router.get('/:id/operations', authorizeRoles('ADMIN', 'PLANNER', 'OPERATOR'), getProductGroupOperations)
router.post('/:id/operations', authorizeRoles('ADMIN', 'PLANNER'), createProductGroupOperation)
router.delete('/:id/operations/:operationId', authorizeRoles('ADMIN', 'PLANNER'), deleteProductGroupOperation)

export default router
