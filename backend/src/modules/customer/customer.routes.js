import express from 'express'
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from './customer.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import authorizeRoles from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
router.get('/', authorizeRoles('ADMIN', 'PLANNER', 'OPERATOR'), getCustomers)
// Assume ADMIN or PLANNER can manage customers
router.post('/', authorizeRoles('ADMIN', 'PLANNER'), createCustomer)
router.put('/:id', authorizeRoles('ADMIN', 'PLANNER'), updateCustomer)
router.delete('/:id', authorizeRoles('ADMIN'), deleteCustomer)

export default router
