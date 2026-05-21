import express from "express";
import { getNotifications, markAsRead, markAllAsRead } from "./notification.controller.js";
import verifyToken from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.use(verifyToken);

router.get("/", getNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);

export default router;
