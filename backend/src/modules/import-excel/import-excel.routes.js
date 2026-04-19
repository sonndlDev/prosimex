import express from "express";
import verifyToken from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { importMasterData } from "./import-excel.controller.js";

const router = express.Router();

router.use(verifyToken);

router.post("/master-data", authorize(["ADMIN", "PLANNER"], "import_excel"), importMasterData);

export default router;
