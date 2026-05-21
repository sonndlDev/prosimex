import express from 'express'
import { getFactories, createFactory, updateFactory, deleteFactory } from './factory.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
// Assuming ADMIN can manage factories. Add more generic roles if needed.
router.get('/', authorize(['ADMIN', 'PLANNER'], 'factories:read'), getFactories)
router.post('/', authorize(['ADMIN'], 'factories:create'), createFactory)
router.put('/:id', authorize(['ADMIN'], 'factories:update'), updateFactory)
router.delete('/:id', authorize(['ADMIN'], 'factories:delete'), deleteFactory)

export default router
