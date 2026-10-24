/**
 * @file product-group.controller.js
 * HTTP adapter for the product-group module.
 *
 * Read functions delegate to productGroupService.
 * Mutation functions (Type D) are re-exported unchanged from the legacy controller.
 */

import { productGroupService } from './product-group.service.js';

// ── Read handlers ─────────────────────────────────────────────────────────────

export const getProductGroups = async (req, res) => {
  try {
    const { factory_id, page = 1, limit = 10, search = '' } = req.query;
    const result = await productGroupService.getProductGroups(
      { factory_id, search },
      { page, limit }
    );
    res.json(result);
  } catch (error) {
    console.error('Get Product Groups Error:', error);
    res.status(500).json({ message: 'Error retrieving product groups', error });
  }
};

export const getProductGroupOperations = async (req, res) => {
  try {
    const { id } = req.params;
    const { order_id, product_id } = req.query;
    const rows = await productGroupService.getProductGroupOperations(id, { order_id, product_id });
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving operations for group', error });
  }
};

export const getStageConfigs = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await productGroupService.getStageConfigs(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving stage configs', error });
  }
};

export const exportProductGroups = async (req, res) => {
  try {
    const { factory_id, search = '' } = req.query;
    const rows = await productGroupService.exportProductGroups({ factory_id, search });
    res.json(rows);
  } catch (error) {
    console.error('Export Product Groups Error:', error);
    res.status(500).json({ message: 'Error exporting product groups', error });
  }
};

// ── Mutations re-exported from legacy (Type D) ────────────────────────────────

export {
  createProductGroup,
  updateProductGroup,
  deleteProductGroup,
  createProductGroupOperation,
  deleteProductGroupOperation,
  updateProductGroupOperation,
  reorderProductGroupOperations,
  saveStageConfigs,
} from './__legacy__/product-group.controller.legacy.js';
