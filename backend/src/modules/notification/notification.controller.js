import pool from "../../config/db.js";

// GET /api/notifications
// Get notifications for the current user based on role or direct targeting
export const getNotifications = async (req, res) => {
  try {
    const { id: user_id, role_name } = req.user;
    const perms = req.user.permissions || [];

    // Determine which target_roles this user can see
    const targetRoles = [role_name];
    if (role_name === 'ADMIN' || (perms.includes('daily_tickets:auto_approve') && !targetRoles.includes('PLANNER'))) {
      if (!targetRoles.includes('PLANNER')) targetRoles.push('PLANNER');
    }

    const placeholders = targetRoles.map((_, i) => `$${i + 2}`).join(', ');
    const query = `
      SELECT id, message, link, is_read, created_at 
      FROM notifications
      WHERE user_id = $1 OR target_role IN (${placeholders})
      ORDER BY created_at DESC
      LIMIT 50
    `;
    const result = await pool.query(query, [user_id, ...targetRoles]);

    const unreadCount = result.rows.filter(n => !n.is_read).length;

    res.json({
      success: true,
      data: result.rows,
      unreadCount
    });
  } catch (error) {
    console.error("Lỗi lấy thông báo:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// PUT /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    // Since notifications might be for a role, we'll just mark it read for everyone for simplicity
    // A more complex system would have a user_notifications mapping table.
    // Given the requirements, this is a basic implementation.
    
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1`,
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Lỗi cập nhật thông báo:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// PUT /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    const { id: user_id, role_name } = req.user;
    const perms = req.user.permissions || [];
    
    const targetRoles = [role_name];
    if (role_name === 'ADMIN' || (perms.includes('daily_tickets:auto_approve') && !targetRoles.includes('PLANNER'))) {
      if (!targetRoles.includes('PLANNER')) targetRoles.push('PLANNER');
    }

    const placeholders = targetRoles.map((_, i) => `$${i + 2}`).join(', ');
    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 OR target_role IN (${placeholders})`,
      [user_id, ...targetRoles]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Lỗi cập nhật thông báo:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
