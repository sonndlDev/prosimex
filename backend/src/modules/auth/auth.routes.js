import express from 'express'
import { login, getMe } from './auth.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'

const router = express.Router()

router.post('/login', login)
router.get('/me', verifyToken, getMe)

export default router
