import express from 'express'
import { getMachineScheduleCalendar } from './machine-schedule.controller.js'
import verifyToken from '../../middlewares/auth.middleware.js'
import authorizeRoles from '../../middlewares/rbac.middleware.js'

const router = express.Router()

router.use(verifyToken)
// GET /machine-schedule/calendar?factory_id=&start_date=&end_date=
router.get('/calendar', authorizeRoles('ADMIN', 'PLANNER', 'OPERATOR'), getMachineScheduleCalendar)

export default router
