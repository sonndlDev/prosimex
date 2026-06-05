import express from 'express'
import {
  getProductGroups, createProductGroup, updateProductGroup, deleteProductGroup,
  getProductGroupOperations, createProductGroupOperation, deleteProductGroupOperation,
  updateProductGroupOperation, reorderProductGroupOperations,
  getStageConfigs, saveStageConfigs
} from './product-group.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
// Assuming PLANNER manages product groups
router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'product_groups:read'), getProductGroups)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'product_groups:create'), createProductGroup)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'product_groups:update'), updateProductGroup)
router.delete('/:id', authorize(['ADMIN'], 'product_groups:delete'), deleteProductGroup)

// Nested Operations Routes for a specific Product Group
router.get('/:id/operations', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'product_groups:read'), getProductGroupOperations)
router.post('/:id/operations', authorize(['ADMIN', 'PLANNER'], 'product_groups:create'), createProductGroupOperation)
router.put('/:id/operations/reorder', authorize(['ADMIN', 'PLANNER'], 'product_groups:update'), reorderProductGroupOperations)
router.put('/:id/operations/:operationId', authorize(['ADMIN', 'PLANNER'], 'product_groups:update'), updateProductGroupOperation)
router.delete('/:id/operations/:operationId', authorize(['ADMIN', 'PLANNER'], 'product_groups:delete'), deleteProductGroupOperation)

router.get('/:id/stage-configs', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'product_groups:read'), getStageConfigs)
router.put('/:id/stage-configs', authorize(['ADMIN', 'PLANNER'], 'product_groups:update'), saveStageConfigs)

export default router
