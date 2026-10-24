/**
 * @file factory.controller.js
 * HTTP adapter for the factory module.
 * Read logic delegates to factoryService.
 * Mutations are re-exported unchanged from the legacy controller.
 */

import { factoryService } from './factory.service.js';

export const getFactories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const result = await factoryService.getFactories({ search }, { page, limit });
    res.json(result);
  } catch (error) {
    console.error('Get Factories Error:', error);
    res.status(500).json({ message: 'Error retrieving factories', error });
  }
};

// Re-export mutations from legacy — no behaviour change
export { createFactory, updateFactory, deleteFactory } from './__legacy__/factory.controller.legacy.js';
