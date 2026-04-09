import express from 'express';
import { getInventory, saveInventory } from './product-inventory.controller.js';
import verifyToken from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'productInventory'), getInventory);
router.post('/', authorize(['ADMIN', 'PLANNER'], 'productInventory'), saveInventory);

export default router;
