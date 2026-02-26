import pool from '../../config/db.js';

export const getWorkers = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * 
             FROM workers 
             WHERE deleted_at IS NULL 
             ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error('getWorkers error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const createWorker = async (req, res) => {
    try {
        const { code, name, phone, factory_id } = req.body;
        if (!code || !name) {
            return res.status(400).json({ message: 'Code and name are required' });
        }

        const result = await pool.query(
            `INSERT INTO workers (code, name, phone, factory_id) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [code.toUpperCase(), name, phone, factory_id || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('createWorker error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Worker code already exists' });
        }
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateWorker = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, phone, factory_id, is_active } = req.body;

        const result = await pool.query(
            `UPDATE workers 
             SET code = COALESCE($1, code),
                 name = COALESCE($2, name),
                 phone = COALESCE($3, phone),
                 factory_id = $4,
                 is_active = COALESCE($5, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6 AND deleted_at IS NULL
             RETURNING *`,
            [code ? code.toUpperCase() : null, name, phone, factory_id || null, is_active, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Worker not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('updateWorker error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteWorker = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE workers 
             SET deleted_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND deleted_at IS NULL`,
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Worker not found' });
        }
        res.json({ message: 'Worker deleted successfully' });
    } catch (error) {
        console.error('deleteWorker error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
