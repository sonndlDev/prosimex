import express from 'express'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from './customer.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'customers'), getCustomers)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'customers'), createCustomer)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'customers'), updateCustomer)
router.delete('/:id', authorize(['ADMIN'], 'customers'), deleteCustomer)

export default router
