import { orderService } from './order.service.js';

// Re-export functions not yet refactored
export { updateOrder, updateWarehouseDetails, getOrderSummaryReport } from './order.controller.legacy.js';

export const getOrders = async (req, res) => {
  try {
    const {
      factory_id,
      page = 1,
      limit = 10,
      search = '',
      startDate,
      endDate,
      dateType = 'received',
      status,
      customer_id,
      product_id,
      person_in_charge,
      location,
    } = req.query;

    const filters = { factory_id, search, status, customer_id, product_id, person_in_charge, location, startDate, endDate, dateType };
    const pagination = { page, limit };

    const result = await orderService.getOrders(filters, pagination);
    res.json(result);
  } catch (error) {
    console.error('Get Orders Error:', error);
    res.status(500).json({ message: 'Error retrieving orders', error });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderService.getOrderById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Get Order By Id Error:', error);
    res.status(500).json({ message: 'Error retrieving order' });
  }
};

export const getOrderCompletionReport = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await orderService.getCompletionReport(id);
    if (!result) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('Get Order Completion Report Error:', error);
    res.status(500).json({ message: 'Error retrieving order completion report', error });
  }
};

export const getOrderProductSnapshots = async (req, res) => {
  try {
    const result = await orderService.getProductSnapshots(req.query);
    res.json(result);
  } catch (error) {
    console.error('Get Order Product Snapshots Error:', error);
    res.status(500).json({ message: 'Error retrieving order product snapshots' });
  }
};

export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    const newOrder = await orderService.createOrder(req.body, userId);
    res.status(201).json(newOrder);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Order code must be unique' });
    }
    console.error('Create Order Error:', error);
    res.status(500).json({ message: 'Error creating order' });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await orderService.deleteOrder(id, userId);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(500).json({ message: 'Error deleting order', error });
  }
};
