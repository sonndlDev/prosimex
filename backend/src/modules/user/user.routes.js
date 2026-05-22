import express from 'express'
import { getUsers, createUser, updateUser, deleteUser, getRoles, createRole, deleteRole, updateRolePermissions, updateProfile } from './user.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)

router.get('/', authorize(['ADMIN'], 'users:read'), getUsers)
router.get('/roles', authorize(['ADMIN'], 'users:read'), getRoles)
router.post('/roles', authorize(['ADMIN'], 'users:create'), createRole)
router.put('/roles/:id/permissions', authorize(['ADMIN'], 'users:update'), updateRolePermissions)
router.delete('/roles/:id', authorize(['ADMIN'], 'users:delete'), deleteRole)
router.post('/', authorize(['ADMIN'], 'users:create'), createUser)
router.put('/:id', authorize(['ADMIN'], 'users:update'), updateUser)
router.delete('/:id', authorize(['ADMIN'], 'users:delete'), deleteUser)
router.put('/profile/update', updateProfile) // authenticated users can update own profile

export default router
