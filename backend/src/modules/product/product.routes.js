import express from 'express'
import { getProducts, createProduct, updateProduct, deleteProduct } from './product.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import authorizeRoles from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
router.get('/', authorizeRoles('ADMIN', 'PLANNER', 'OPERATOR'), getProducts)
router.post('/', authorizeRoles('ADMIN', 'PLANNER'), createProduct)
router.put('/:id', authorizeRoles('ADMIN', 'PLANNER'), updateProduct)
router.delete('/:id', authorizeRoles('ADMIN'), deleteProduct)

export default router
