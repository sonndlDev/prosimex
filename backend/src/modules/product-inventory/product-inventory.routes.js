import express from 'express';
import { getInventory, saveInventory } from './product-inventory.controller.js';
import verifyToken from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'product_inventory:read'), getInventory);
router.post('/', authorize(['ADMIN', 'PLANNER'], 'product_inventory:create'), saveInventory);

export default router;
