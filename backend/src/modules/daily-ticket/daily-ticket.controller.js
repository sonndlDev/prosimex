import { dailyTicketService } from './daily-ticket.service.js';

// Legacy re-exports — functions not yet refactored to service/repository
export {
  createTicket,
  updateTicket,
  updateTicketResults,
  deleteTicket,
  importResults,
  getPlanVsActualReport,
  triggerAutoGenerate,
  manualOutputEntry,
  exportDetailedTickets,
} from './daily-ticket.controller.legacy.js';

// GET /api/daily-tickets
export const getTickets = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      search,
      status,
      is_manual,
      created_by,
      ticket_code,
      operation_name,
      exclude_pending,
    } = req.query;
    const pageInt = parseInt(page);
    const limitInt = parseInt(limit);

    const { total, rows } = await dailyTicketService.getTickets(
      { startDate, endDate, search, status, is_manual, created_by, ticket_code, operation_name, exclude_pending },
      { limit: limitInt, offset: (pageInt - 1) * limitInt }
    );

    res.json({
      data: rows,
      total,
      page: pageInt,
      limit: limitInt,
      totalPages: Math.ceil(total / limitInt),
    });
  } catch (error) {
    console.error("Get Daily Tickets Error:", error);
    res.status(500).json({ message: "Error retrieving daily tickets", error });
  }
};

// GET /api/daily-tickets/:id
export const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await dailyTicketService.getTicketById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    res.json(ticket);
  } catch (error) {
    console.error("Get Daily Ticket By ID Error:", error);
    res.status(500).json({ message: "Error retrieving daily ticket details", error });
  }
};

// PUT /api/daily-tickets/:id/approve
export const approveTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const result = await dailyTicketService.approveTicket(id, user_id);

    if (result.notFound) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    if (result.badRequest) {
      return res.status(400).json({ message: result.message });
    }

    res.json({ message: "Ticket approved successfully" });
  } catch (error) {
    console.error("Approve Ticket Error:", error);
    res.status(500).json({ message: "Error approving ticket", error });
  }
};

// PUT /api/daily-tickets/:id/reject
export const rejectTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    const result = await dailyTicketService.rejectTicket(id, user_id);

    if (result.notFound) {
      return res.status(404).json({ message: "Ticket not found" });
    }
    if (result.badRequest) {
      return res.status(400).json({ message: result.message });
    }

    res.json({ message: "Ticket rejected successfully" });
  } catch (error) {
    console.error("Reject Ticket Error:", error);
    res.status(500).json({ message: "Error rejecting ticket", error });
  }
};
