import express from 'express'
import { getMachines, createMachine, updateMachine, deleteMachine } from './machine.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import authorizeRoles from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
// Assuming ADMIN, PLANNER, OPERATOR can view machines, but only ADMIN/PLANNER can manage
router.get('/', authorizeRoles('ADMIN', 'PLANNER', 'OPERATOR'), getMachines)
router.post('/', authorizeRoles('ADMIN', 'PLANNER'), createMachine)
router.put('/:id', authorizeRoles('ADMIN', 'PLANNER'), updateMachine)
router.delete('/:id', authorizeRoles('ADMIN'), deleteMachine)

export default router
