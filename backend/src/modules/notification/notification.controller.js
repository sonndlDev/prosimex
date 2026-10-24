/**
 * @file notification.controller.js
 * HTTP adapter for the notification module.
 * Read logic delegates to notificationService.
 * Mutations (markAsRead, markAllAsRead) are re-exported unchanged from the legacy controller.
 */

import { notificationService } from './notification.service.js';

export const getNotifications = async (req, res) => {
  try {
    const result = await notificationService.getNotifications(req.user);
    res.json(result);
  } catch (error) {
    console.error("Lỗi lấy thông báo:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Re-export mutations from legacy — no behaviour change
export { markAsRead, markAllAsRead } from './__legacy__/notification.controller.legacy.js';
