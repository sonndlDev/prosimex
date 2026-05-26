import express from "express";
import {
  getTickets,
  exportDetailedItems,
  getTicketByCode,
  createTicket,
  addReturnEntry,
  updateTicket,
  deleteTicket
} from "./outsourcing.controller.js";
import verifyToken from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/rbac.middleware.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// These routes may require specific permissions in the future. 
// For now, depending on the requirement, we might use "planning" or a new permission.
// router.use(permissionsMiddleware("planning"));

// API Endpoints
router.get("/", authorize(["ADMIN", "PLANNER", "MANAGER"], 'outsourcing:read'), getTickets);
router.get("/export-detailed", authorize(["ADMIN", "PLANNER", "MANAGER"], 'outsourcing:read'), exportDetailedItems);
router.post("/", authorize(["ADMIN", "PLANNER", "MANAGER"], 'outsourcing:create'), createTicket);
router.get("/:ticket_code", authorize(["ADMIN", "PLANNER", "MANAGER"], 'outsourcing:read'), getTicketByCode);
router.post("/:ticket_id/returns", authorize(["ADMIN", "PLANNER", "MANAGER"], 'outsourcing:create'), addReturnEntry);
router.put("/:id", authorize(["ADMIN", "PLANNER", "MANAGER"], 'outsourcing:update'), updateTicket);
router.delete("/:id", authorize(["ADMIN", "PLANNER", "MANAGER"], 'outsourcing:delete'), deleteTicket);

export default router;
