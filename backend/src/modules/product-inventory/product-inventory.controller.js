/**
 * @file product-inventory.controller.js
 * HTTP adapter for the product-inventory module.
 *
 * getInventory delegates to productInventoryService (Type C).
 * Mutations (Type D) are re-exported unchanged from the legacy controller.
 */

import { productInventoryService } from './product-inventory.service.js';

export const getInventory = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', inventory_type = 'ALL', completed = 'ALL' } = req.query;
    const result = await productInventoryService.getInventory(
      { search, inventory_type, completed },
      { page, limit }
    );
    res.json(result);
  } catch (error) {
    console.error('Get Product Inventory Error:', error);
    res.status(500).json({ message: 'Error retrieving product inventory', error: error.message });
  }
};

// ── Mutations re-exported from legacy (Type D) ────────────────────────────────

export {
  saveInventory,
  updateInventory,
  completeInventory,
  exportInventory,
  deleteInventory,
} from './__legacy__/product-inventory.controller.legacy.js';
