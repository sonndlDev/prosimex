/**
 * @file attendance.controller.js
 * HTTP adapter for the attendance module.
 * Read logic delegates to attendanceService.
 * Mutations (checkIn, checkOut) are re-exported unchanged from the legacy controller.
 */

import { attendanceService } from './attendance.service.js';

export const getTodayStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const record = await attendanceService.getTodayStatus(userId);
    res.json(record);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy trạng thái chấm công', error: error.message });
  }
};

export const getAttendanceLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role_name;
    const { targetUserId, startDate, endDate, page = 1, limit = 10 } = req.query;

    const result = await attendanceService.getAttendanceLogs(
      { userId, userRole, targetUserId, startDate, endDate },
      { page, limit }
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi khi lấy lịch sử chấm công', error: error.message });
  }
};

// Re-export mutations from legacy — no behaviour change
export { checkIn, checkOut } from './__legacy__/attendance.controller.legacy.js';
