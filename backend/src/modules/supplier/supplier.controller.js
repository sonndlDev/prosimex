/**
 * @file supplier.controller.js
 * HTTP adapter for the supplier module.
 * Read logic delegates to supplierService.
 * Mutations are re-exported unchanged from the legacy controller.
 */

import { supplierService } from './supplier.service.js';

export const getSuppliers = async (req, res) => {
  try {
    const { search = '' } = req.query;
    const rows = await supplierService.getSuppliers({ search });
    res.json(rows);
  } catch (error) {
    console.error('Get Suppliers Error:', error);
    res.status(500).json({ message: 'Lỗi khi lấy danh sách nhà cung cấp', error });
  }
};

// Re-export mutations from legacy — no behaviour change
export { createSupplier, updateSupplier, deleteSupplier } from './__legacy__/supplier.controller.legacy.js';
