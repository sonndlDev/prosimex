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

router.get("/", getTickets);
router.get("/report/plan-vs-actual", getPlanVsActualReport);
router.post("/auto-generate", authorize(["ADMIN", "PLANNER"], 'daily_tickets:read'), triggerAutoGenerate);
router.post("/manual-output", manualOutputEntry);
router.get("/export/detailed", exportDetailedTickets);

router.get("/:id", getTicketById);
router.post("/", authorize(["ADMIN", "PLANNER"], 'daily_tickets:create'), createTicket);
router.put("/:id", authorize(["ADMIN", "PLANNER", "MANAGER"], 'daily_tickets:update'), updateTicket);
router.put("/:id/approve", authorize(["ADMIN", "PLANNER"], 'daily_tickets:update'), approveTicket);
router.put("/:id/reject", authorize(["ADMIN", "PLANNER"], 'daily_tickets:update'), rejectTicket);
router.put("/:id/results", authorize(["ADMIN", "PLANNER", "MANAGER"], 'daily_tickets:update'), updateTicketResults);
router.delete("/:id", authorize(["ADMIN", "PLANNER"], 'daily_tickets:delete'), deleteTicket);

export default router;
