/**
 * @file machine.controller.js
 * HTTP adapter for the machine module.
 * Read logic delegates to machineService.
 * Mutations are re-exported unchanged from the legacy controller.
 */

import { machineService } from './machine.service.js';

export const getMachines = async (req, res) => {
  try {
    const { factory_id, page = 1, limit = 10, search = '' } = req.query;
    const result = await machineService.getMachines({ factory_id, search }, { page, limit });
    res.json(result);
  } catch (error) {
    console.error('Get Machines Error:', error);
    res.status(500).json({ message: 'Error retrieving machines', error });
  }
};

// Re-export mutations from legacy — no behaviour change
export { createMachine, updateMachine, deleteMachine } from './__legacy__/machine.controller.legacy.js';
