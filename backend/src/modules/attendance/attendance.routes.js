import express from 'express'
import { checkIn, checkOut, getTodayStatus, getAttendanceLogs } from './attendance.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'

const router = express.Router()

router.use(verifyToken)

router.post('/check-in', checkIn)
router.post('/check-out', checkOut)
router.get('/today', getTodayStatus)
router.get('/logs', getAttendanceLogs)

export default router
