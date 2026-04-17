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
  manualOutputEntry
} from "./daily-ticket.controller.js";


const router = express.Router();

router.use(verifyToken);

router.get("/", getTickets);
router.get("/report/plan-vs-actual", getPlanVsActualReport);
router.post("/auto-generate", authorize(["ADMIN", "PLANNER"], "daily_tickets"), triggerAutoGenerate);
router.post("/manual-output", manualOutputEntry);

router.get("/:id", getTicketById);
router.post("/", authorize(["ADMIN", "PLANNER"], "daily_tickets"), createTicket);
router.put("/:id", authorize(["ADMIN", "PLANNER", "MANAGER"], "daily_tickets"), updateTicket);
router.put("/:id/results", authorize(["ADMIN", "PLANNER", "MANAGER"], "daily_tickets"), updateTicketResults);
router.delete("/:id", authorize(["ADMIN", "PLANNER"], "daily_tickets"), deleteTicket);

export default router;
