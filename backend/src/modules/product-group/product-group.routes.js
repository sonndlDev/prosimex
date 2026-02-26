import express from 'express'
import {
  getProductGroups, createProductGroup, updateProductGroup, deleteProductGroup,
  getProductGroupOperations, createProductGroupOperation, deleteProductGroupOperation,
  updateProductGroupOperation, reorderProductGroupOperations
} from './product-group.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
// Assuming PLANNER manages product groups
router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'product_groups'), getProductGroups)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'product_groups'), createProductGroup)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'product_groups'), updateProductGroup)
router.delete('/:id', authorize(['ADMIN'], 'product_groups'), deleteProductGroup)

// Nested Operations Routes for a specific Product Group
router.get('/:id/operations', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'product_groups'), getProductGroupOperations)
router.post('/:id/operations', authorize(['ADMIN', 'PLANNER'], 'product_groups'), createProductGroupOperation)
router.put('/:id/operations/reorder', authorize(['ADMIN', 'PLANNER'], 'product_groups'), reorderProductGroupOperations)
router.put('/:id/operations/:operationId', authorize(['ADMIN', 'PLANNER'], 'product_groups'), updateProductGroupOperation)
router.delete('/:id/operations/:operationId', authorize(['ADMIN', 'PLANNER'], 'product_groups'), deleteProductGroupOperation)

export default router
