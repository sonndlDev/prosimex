import express from "express";
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from "./supplier.controller.js";
import verifyToken from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/rbac.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", authorize([], "suppliers"), getSuppliers);
router.post("/", authorize([], "suppliers"), createSupplier);
router.put("/:id", authorize([], "suppliers"), updateSupplier);
router.delete("/:id", authorize([], "suppliers"), deleteSupplier);

export default router;
