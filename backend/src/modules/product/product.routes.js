import express from 'express'
import { getProducts, createProduct, updateProduct, deleteProduct } from './product.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'products:read'), getProducts)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'products:create'), createProduct)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'products:update'), updateProduct)
router.delete('/:id', authorize(['ADMIN'], 'products:delete'), deleteProduct)

export default router
