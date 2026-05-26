import express from 'express'
import { getMachines, createMachine, updateMachine, deleteMachine } from './machine.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
// Assuming ADMIN, PLANNER, OPERATOR can view machines, but only ADMIN/PLANNER can manage
router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'machines:read'), getMachines)
router.post('/', authorize(['ADMIN', 'PLANNER'], 'machines:create'), createMachine)
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'machines:update'), updateMachine)
router.delete('/:id', authorize(['ADMIN'], 'machines:delete'), deleteMachine)

export default router
