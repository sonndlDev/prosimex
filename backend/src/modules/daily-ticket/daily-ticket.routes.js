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
  getPlanVsActualReport
} from "./daily-ticket.controller.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", getTickets);
router.get("/report/plan-vs-actual", getPlanVsActualReport);
router.get("/:id", getTicketById);
router.post("/", authorize(["ADMIN", "PLANNER"]), createTicket);
router.put("/:id", authorize(["ADMIN", "PLANNER", "MANAGER"]), updateTicket);
router.put("/:id/results", authorize(["ADMIN", "PLANNER", "MANAGER"]), updateTicketResults);
router.delete("/:id", authorize(["ADMIN", "PLANNER"]), deleteTicket);

export default router;
