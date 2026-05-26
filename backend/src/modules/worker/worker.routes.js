import express from 'express';
import { getWorkers, createWorker, updateWorker, deleteWorker } from './worker.controller.js';
import verifyToken from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', authorize([], 'workers:read'), getWorkers);
router.post('/', authorize(['ADMIN'], 'workers:create'), createWorker);
router.put('/:id', authorize(['ADMIN'], 'workers:update'), updateWorker);
router.delete('/:id', authorize(['ADMIN'], 'workers:delete'), deleteWorker);

export default router;
