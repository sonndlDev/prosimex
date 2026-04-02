import express from 'express'
import { getMetrics, getActivities } from './dashboard.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'

const router = express.Router()

router.use(verifyToken)

router.get('/metrics', getMetrics)
router.get('/activities', getActivities)

export default router
