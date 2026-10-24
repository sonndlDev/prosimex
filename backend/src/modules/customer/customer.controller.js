/**
 * @file customer.controller.js
 * HTTP adapter for the customer module.
 * All business logic lives in customer.service.js.
 * Routes and middleware signatures are unchanged.
 */

import { customerService } from './customer.service.js';

export const getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const result = await customerService.getCustomers({ search }, { page, limit });
    res.json(result);
  } catch (error) {
    console.error('Get Customers Error:', error);
    res.status(500).json({ message: 'Error retrieving customers', error });
  }
};

export const createCustomer = async (req, res) => {
  try {
    const userId = req.user?.id;
    const newCustomer = await customerService.createCustomer(req.body, userId);
    res.status(201).json(newCustomer);
  } catch (error) {
    if (error._dupName) return res.status(400).json({ message: error.message });
    if (error._dupCode) return res.status(400).json({ message: error.message });
    if (error.code === '23505') return res.status(400).json({ message: 'Mã khách hàng đã tồn tại' });
    res.status(500).json({ message: 'Error creating customer', error });
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const updated = await customerService.updateCustomer(id, req.body, userId);
    res.json(updated);
  } catch (error) {
    if (error._notFound) return res.status(404).json({ message: 'Customer not found' });
    if (error._dupName) return res.status(400).json({ message: error.message });
    if (error._dupCode) return res.status(400).json({ message: error.message });
    if (error.code === '23505') return res.status(400).json({ message: 'Customer code already exists' });
    res.status(500).json({ message: 'Error updating customer', error });
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    await customerService.deleteCustomer(id, userId);
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    if (error._notFound) return res.status(404).json({ message: 'Customer not found' });
    res.status(500).json({ message: 'Error deleting customer', error });
  }
};
