import pool from '../../config/db.js'

export const getAssignments = async (req, res) => {
    try {
        const { production_plan_id, working_date } = req.query;
        
        const result = await pool.query(
            `SELECT w.* 
             FROM workers w
             JOIN worker_plan_assignments wpa ON w.id = wpa.worker_id
             WHERE wpa.production_plan_id = $1 AND wpa.working_date = $2`,
            [production_plan_id, working_date]
        );
        
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving worker assignments', error: error.message });
    }
}

export const updateAssignments = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { production_plan_id, working_date, worker_ids } = req.body;
        
        // 1. Delete existing assignments for this plan and date
        await client.query(
            'DELETE FROM worker_plan_assignments WHERE production_plan_id = $1 AND working_date = $2',
            [production_plan_id, working_date]
        );
        
        // 2. Insert new assignments
        if (worker_ids && worker_ids.length > 0) {
            for (const worker_id of worker_ids) {
                await client.query(
                    'INSERT INTO worker_plan_assignments (production_plan_id, working_date, worker_id) VALUES ($1, $2, $3)',
                    [production_plan_id, working_date, worker_id]
                );
            }
        }
        
        await client.query('COMMIT');
        res.json({ message: 'Assignments updated successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ message: 'Error updating worker assignments', error: error.message });
    } finally {
        client.release();
    }
}
