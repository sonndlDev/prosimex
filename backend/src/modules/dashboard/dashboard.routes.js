import express from 'express'
import { getMetrics, getActivities } from './dashboard.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import { authorize } from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)

router.get('/metrics', authorize([], 'dashboard:read'), getMetrics)
router.get('/activities', authorize([], 'dashboard:read'), getActivities)

export default router
