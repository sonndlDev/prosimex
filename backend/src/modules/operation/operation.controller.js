/**
 * @file operation.controller.js
 * HTTP adapter for the operation module.
 * Read logic delegates to operationService.
 * Mutations are re-exported unchanged from the legacy controller.
 */

import { operationService } from './operation.service.js';

export const getOperations = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const result = await operationService.getOperations({ search }, { page, limit });
    res.json(result);
  } catch (error) {
    console.error('Get Operations Error:', error);
    res.status(500).json({ message: 'Error retrieving operations', error });
  }
};

// Re-export mutations from legacy — no behaviour change
export { createOperation, updateOperation, deleteOperation } from './__legacy__/operation.controller.legacy.js';
