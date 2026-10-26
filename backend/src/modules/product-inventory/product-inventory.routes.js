import express from 'express';
import { getInventory, getExportHistory, saveInventory, updateInventory, completeInventory, exportInventory, deleteInventory } from './product-inventory.controller.js';
import verifyToken from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'product_inventory:read'), getInventory);
router.get('/:id/exports', authorize(['ADMIN', 'PLANNER', 'OPERATOR'], 'product_inventory:read'), getExportHistory);
router.post('/', authorize(['ADMIN', 'PLANNER'], 'product_inventory:create'), saveInventory);
router.put('/:id', authorize(['ADMIN', 'PLANNER'], 'product_inventory:update'), updateInventory);
router.patch('/:id/complete', authorize(['ADMIN', 'PLANNER'], 'product_inventory:update'), completeInventory);
router.post('/:id/export', authorize(['ADMIN', 'PLANNER'], 'product_inventory:update'), exportInventory);
router.delete('/:id', authorize(['ADMIN', 'PLANNER'], 'product_inventory:delete'), deleteInventory);

export default router;
