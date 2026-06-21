import express from 'express';
import { getInventory, saveInventory, updateInventory, completeInventory, deleteInventory } from './product-inventory.controller.js';
import verifyToken from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'product_inventory:read'), getInventory);
router.post('/', authorize(['ADMIN', 'PLANNER'], 'product_inventory:create'), saveInventory);
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'product_inventory:update'), updateInventory);
router.patch('/:id/complete', authorize(['ADMIN', 'PLANNER'], 'product_inventory:update'), completeInventory);
router.delete('/:id', authorize(['ADMIN', 'PLANNER'], 'product_inventory:delete'), deleteInventory);

export default router;
