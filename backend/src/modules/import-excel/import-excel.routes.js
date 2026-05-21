import express from "express";
import verifyToken from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/rbac.middleware.js";
import { importMasterData, getImportHistory } from "./import-excel.controller.js";

const router = express.Router();

router.use(verifyToken);

router.get("/master-data/history", authorize(["ADMIN", "PLANNER"], 'import_excel:read'), getImportHistory);
router.post("/master-data", authorize(["ADMIN", "PLANNER"], 'import_excel:create'), importMasterData);

export default router;
