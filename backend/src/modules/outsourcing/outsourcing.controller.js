import { outsourcingService } from './outsourcing.service.js';
export {
  getRemainingQuantity,
  getTickets,
  getTicketByCode,
  createTicket,
  addReturnEntry,
  updateReturnEntry,
  deleteReturnEntry,
  updateTicket,
  deleteTicket,
} from './outsourcing.controller.legacy.js';

export const exportDetailedItems = async (req, res) => {
  try {
    const { type, search = '', order_id, product_id, date } = req.query;
    const rows = await outsourcingService.getDetailedItems({ type, search, order_id, product_id, date });
    res.json(rows);
  } catch (error) {
    console.error('Export Detailed Items Error:', error);
    res.status(500).json({ message: 'Error retrieving export data' });
  }
};
