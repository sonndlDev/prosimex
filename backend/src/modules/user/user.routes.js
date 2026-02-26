import express from 'express'
import { getUsers, createUser, updateUser, deleteUser, getRoles, createRole, deleteRole, updateProfile } from './user.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)

router.get('/', authorize(['ADMIN'], 'users'), getUsers)
router.get('/roles', authorize(['ADMIN'], 'users'), getRoles)
router.post('/roles', authorize(['ADMIN'], 'users'), createRole)
router.delete('/roles/:id', authorize(['ADMIN'], 'users'), deleteRole)
router.post('/', authorize(['ADMIN'], 'users'), createUser)
router.put('/:id', authorize(['ADMIN'], 'users'), updateUser)
router.delete('/:id', authorize(['ADMIN'], 'users'), deleteUser)
router.put('/profile/update', updateProfile) // authenticated users can update own profile

export default router
