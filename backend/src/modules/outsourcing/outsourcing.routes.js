import express from "express";
import {
  getTickets,
  getTicketByCode,
  createTicket,
  addReturnEntry,
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
router.get("/", authorize(["ADMIN", "PLANNER", "MANAGER"], "outsourcing"), getTickets);
router.post("/", authorize(["ADMIN", "PLANNER", "MANAGER"], "outsourcing"), createTicket);
router.get("/:ticket_code", authorize(["ADMIN", "PLANNER", "MANAGER"], "outsourcing"), getTicketByCode);
router.post("/:ticket_id/returns", authorize(["ADMIN", "PLANNER", "MANAGER"], "outsourcing"), addReturnEntry);

export default router;
