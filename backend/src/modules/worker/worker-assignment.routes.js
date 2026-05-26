import express from 'express';
import verifyToken from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';
import { getAssignments, updateAssignments } from './worker-assignment.controller.js';

const router = express.Router();

router.get('/', verifyToken, authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'planning:read'), getAssignments);
router.post('/', verifyToken, authorize(['ADMIN', 'PLANNER'], 'planning:create'), updateAssignments);

export default router;
