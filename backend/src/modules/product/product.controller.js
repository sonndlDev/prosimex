/**
 * @file product.controller.js
 * HTTP adapter for the product module.
 * Read logic delegates to productService.
 * Mutations are re-exported unchanged from the legacy controller.
 */

import { productService } from './product.service.js';

export const getProducts = async (req, res) => {
  try {
    const { factory_id, page = 1, limit = 10, search = '' } = req.query;
    const result = await productService.getProducts({ factory_id, search }, { page, limit });
    res.json(result);
  } catch (error) {
    console.error('Get Products Error:', error);
    res.status(500).json({ message: 'Error retrieving products', error });
  }
};

// Re-export mutations from legacy — no behaviour change
export { createProduct, updateProduct, deleteProduct } from './__legacy__/product.controller.legacy.js';
