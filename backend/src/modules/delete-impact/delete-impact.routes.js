import express from "express";
import verifyToken from "../../middlewares/auth.middleware.js";
import {
  getEntityDeleteImpact,
  getBulkEntityDeleteImpact,
} from "./delete-impact.controller.js";

const router = express.Router();

router.use(verifyToken);
router.get("/:entity/:id", getEntityDeleteImpact);
router.post("/bulk", getBulkEntityDeleteImpact);

export default router;
