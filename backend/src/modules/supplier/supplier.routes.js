import express from "express";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "./supplier.controller.js";
import verifyToken from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/rbac.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", authorize(["ADMIN", "PLANNER", "MANAGER"]), getSuppliers);
router.post("/", authorize(["ADMIN", "PLANNER", "MANAGER"]), createSupplier);
router.put("/:id", authorize(["ADMIN", "PLANNER", "MANAGER"]), updateSupplier);
router.delete("/:id", authorize(["ADMIN", "PLANNER", "MANAGER"]), deleteSupplier);

export default router;
