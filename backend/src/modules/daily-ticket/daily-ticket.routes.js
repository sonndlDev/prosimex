import express from "express";
import verifyToken from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import {
  getTickets,
  getTicketById,
  createTicket,
  updateTicket,
  updateTicketResults,
  deleteTicket,
  getPlanVsActualReport,
  triggerAutoGenerate,
  manualOutputEntry,
  exportDetailedTickets,
  approveTicket,
  rejectTicket
} from "./daily-ticket.controller.js";


const router = express.Router();

router.use(verifyToken);

router.get("/", authorize([], "daily_tickets:read"), getTickets);
router.get("/report/plan-vs-actual", authorize([], "plan_vs_actual:read"), getPlanVsActualReport);
router.post("/auto-generate", authorize([], "daily_tickets:read"), triggerAutoGenerate);
router.post("/manual-output", authorize([], "production_output:create"), manualOutputEntry);
router.get("/export/detailed", authorize([], "daily_tickets:read"), exportDetailedTickets);

router.get("/:id", authorize([], "daily_tickets:read"), getTicketById);
router.post("/", authorize([], "daily_tickets:create"), createTicket);
router.put("/:id", authorize([], "daily_tickets:update"), updateTicket);
router.put("/:id/approve", authorize([], "daily_tickets:update"), approveTicket);
router.put("/:id/reject", authorize([], "daily_tickets:update"), rejectTicket);
router.put("/:id/results", authorize([], "daily_tickets:update"), updateTicketResults);
router.delete("/:id", authorize([], "daily_tickets:delete"), deleteTicket);

export default router;
