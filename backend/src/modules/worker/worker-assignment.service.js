import pool from '../../config/db.js'

export const workerAssignmentService = {
  async getAssignments({ production_plan_id, working_date }) {
    const result = await pool.query(
      `SELECT w.*
       FROM workers w
       JOIN worker_plan_assignments wpa ON w.id = wpa.worker_id
       WHERE wpa.production_plan_id = $1 AND wpa.working_date = $2`,
      [production_plan_id, working_date]
    );

    return result.rows;
  }
};
