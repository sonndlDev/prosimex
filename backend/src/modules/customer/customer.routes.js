import express from 'express'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from './customer.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'customers:read'), getCustomers)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'customers:create'), createCustomer)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'customers:update'), updateCustomer)
router.delete('/:id', authorize(['ADMIN'], 'customers:delete'), deleteCustomer)

export default router
