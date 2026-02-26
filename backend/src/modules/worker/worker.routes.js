import express from 'express';
import { getWorkers, createWorker, updateWorker, deleteWorker } from './worker.controller.js';
import verifyToken from '../../middlewares/auth.middleware.js';
import { authorize } from '../../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/', authorize([], 'workers'), getWorkers);
router.post('/', authorize(['ADMIN'], 'workers'), createWorker);
router.put('/:id', authorize(['ADMIN'], 'workers'), updateWorker);
router.delete('/:id', authorize(['ADMIN'], 'workers'), deleteWorker);

export default router;
