import pool from "../../config/db.js";

export const getMetrics = async (req, res) => {
  try {
    // Chạy tất cả queries song song với Promise.all — giảm latency đáng kể
    const [
      ordersByStatusRes,
      plansCount,
      machinesQuery,
      usersCount,
      todayAttendanceRes,
      totalWorkersRes,
      myAttendanceRes,
      urgentOrdersRes,
      productionProgressRes,
      activities,
    ] = await Promise.all([
      pool.query(`
        SELECT status, COUNT(*) as count
        FROM orders
        WHERE deleted_at IS NULL
        GROUP BY status
      `),
      pool.query(
        "SELECT COUNT(*) FROM production_plans WHERE status IN ('RUNNING', 'PLANNED') AND deleted_at IS NULL"
      ),
      pool.query(
        "SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM machines WHERE deleted_at IS NULL"
      ),
      pool.query(`
        SELECT COUNT(*) 
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE u.is_active = true 
          AND u.deleted_at IS NULL
          AND r.name NOT IN ('ADMIN', 'SUPER_ADMIN')
      `),
      pool.query(`
        SELECT 
          COUNT(*) as checked_in,
          COUNT(*) FILTER (WHERE check_out_time IS NOT NULL) as checked_out
        FROM attendance
        WHERE date = CURRENT_DATE
      `),
      pool.query(
        "SELECT COUNT(*) FROM workers WHERE is_active = true AND deleted_at IS NULL"
      ),
      pool.query(
        `SELECT id, check_in_time, check_out_time FROM attendance WHERE user_id = $1 AND date = CURRENT_DATE`,
        [req.user.id]
      ),
      pool.query(`
        SELECT 
          o.id, o.order_code, o.name, o.delivery_date, o.status,
          c.name as customer_name,
          EXTRACT(DAY FROM o.delivery_date - NOW()) as days_left
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        WHERE o.deleted_at IS NULL
          AND o.status NOT IN ('DONE', 'CANCELLED')
          AND o.delivery_date IS NOT NULL
          AND o.delivery_date <= NOW() + INTERVAL '7 days'
        ORDER BY o.delivery_date ASC
        LIMIT 8
      `),
      pool.query(`
        SELECT 
          o.id,
          o.order_code,
          o.name as order_name,
          c.name as customer_name,
          o.quantity as total_quantity,
          COALESCE(pq.completed_quantity, 0) as completed_quantity,
          o.delivery_date
        FROM orders o
        JOIN customers c ON o.customer_id = c.id
        LEFT JOIN (
          SELECT dti.order_id, SUM(dti.actual_quantity) as completed_quantity
          FROM daily_production_ticket_items dti
          JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
          WHERE dt.status = 'COMPLETED' AND dt.deleted_at IS NULL
          GROUP BY dti.order_id
        ) pq ON o.id = pq.order_id
        WHERE o.deleted_at IS NULL
          AND o.status = 'IN_PROGRESS'
        ORDER BY o.delivery_date ASC
        LIMIT 5
      `),
      pool.query(`
        SELECT 
          al.action, 
          al.entity, 
          al.created_at, 
          COALESCE(u.full_name, u.username, 'Hệ thống') AS user_name
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC
        LIMIT 5
      `),
    ]);

    // Xử lý kết quả (logic giữ nguyên)
    const statusMap = {};
    for (const row of ordersByStatusRes.rows) {
      statusMap[row.status] = parseInt(row.count);
    }
    const ordersByStatus = {
      DRAFT: statusMap['DRAFT'] || 0,
      PLANNED: statusMap['PLANNED'] || 0,
      IN_PROGRESS: statusMap['IN_PROGRESS'] || 0,
      DONE: statusMap['DONE'] || 0,
      CANCELLED: statusMap['CANCELLED'] || 0,
    };
    const totalOrders = Object.values(ordersByStatus).reduce((a, b) => a + b, 0);

    const activePlans = parseInt(plansCount.rows[0].count);

    const totalMachines = parseInt(machinesQuery.rows[0].total) || 0;
    const activeMachinesCount = parseInt(machinesQuery.rows[0].active) || 0;
    const machineEfficiency = totalMachines > 0
      ? Math.round((activeMachinesCount / totalMachines) * 100)
      : 0;

    const activeUsers = parseInt(usersCount.rows[0].count);

    const todayAttendance = {
      checkedIn: parseInt(todayAttendanceRes.rows[0].checked_in) || 0,
      checkedOut: parseInt(todayAttendanceRes.rows[0].checked_out) || 0,
      totalWorkers: parseInt(totalWorkersRes.rows[0].count) || 0,
    };

    const myAttendance = myAttendanceRes.rowCount > 0 ? myAttendanceRes.rows[0] : null;

    const urgentOrders = urgentOrdersRes.rows.map(r => ({
      ...r,
      days_left: Math.ceil(parseFloat(r.days_left))
    }));

    const productionProgress = productionProgressRes.rows.map(r => {
      const total = parseFloat(r.total_quantity) || 0;
      const completed = parseFloat(r.completed_quantity) || 0;
      const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
      return { ...r, completion_pct: pct };
    });

    res.json({
      totalOrders,
      ordersByStatus,
      activePlans,
      activeMachines: machineEfficiency,
      activeUsers,
      todayAttendance,
      myAttendance,
      urgentOrders,
      productionProgress,
      activities: activities.rows
    });
  } catch (error) {
    console.error("Dashboard Metrics Error:", error);
    res.status(500).json({ message: "Error retrieving dashboard metrics", error });
  }
};

export const getActivities = async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 15;
    const offset = (pageInt - 1) * limitInt;

    const countResult = await pool.query("SELECT COUNT(*) FROM audit_logs");
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT 
         al.id,
         al.action, 
         al.entity,
         al.entity_id,
         al.created_at, 
         COALESCE(u.full_name, u.username, 'Hệ thống') AS user_name
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limitInt, offset]
    );

    res.json({
      data: result.rows,
      total,
      page: pageInt,
      limit: limitInt,
      totalPages: Math.ceil(total / limitInt)
    });
  } catch (error) {
    console.error("Dashboard Activities Error:", error);
    res.status(500).json({ message: "Error retrieving activities", error });
  }
};
