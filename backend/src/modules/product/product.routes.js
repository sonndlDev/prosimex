import express from 'express'
import { getProducts, createProduct, updateProduct, deleteProduct } from './product.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'products'), getProducts)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'products'), createProduct)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'products'), updateProduct)
router.delete('/:id', authorize(['ADMIN'], 'products'), deleteProduct)

export default router
