import express from 'express'
import { getUsers, createUser, updateUser, deleteUser } from './user.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import authorizeRoles from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)

router.get('/', authorizeRoles('ADMIN'), getUsers)
router.post('/', authorizeRoles('ADMIN'), createUser)
router.put('/:id', authorizeRoles('ADMIN'), updateUser)
router.delete('/:id', authorizeRoles('ADMIN'), deleteUser)

export default router
