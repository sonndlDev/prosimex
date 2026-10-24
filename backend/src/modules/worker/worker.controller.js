/**
 * @file worker.controller.js
 * HTTP adapter for the worker module.
 * Read logic delegates to workerService.
 * Mutations are re-exported unchanged from the legacy controller.
 */

import { workerService } from './worker.service.js';

export const getWorkers = async (req, res) => {
  try {
    const { factory_id, page = 1, limit = 10, search = '' } = req.query;
    const result = await workerService.getWorkers({ factory_id, search }, { page, limit });
    res.json(result);
  } catch (error) {
    console.error('Get Workers Error:', error);
    res.status(500).json({ message: 'Error retrieving workers', error });
  }
};

// Re-export mutations from legacy — no behaviour change
export { createWorker, updateWorker, deleteWorker } from './__legacy__/worker.controller.legacy.js';
