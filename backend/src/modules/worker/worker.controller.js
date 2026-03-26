import pool from '../../config/db.js';

export const getWorkers = async (req, res) => {
  try {
    const { factory_id, page = 1, limit = 10, search = "" } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = (pageInt - 1) * limitInt;

    let whereClause = "WHERE deleted_at IS NULL";
    const queryParams = [];

    if (factory_id) {
      queryParams.push(factory_id);
      whereClause += ` AND factory_id = $${queryParams.length}`;
    }

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (name ILIKE $${queryParams.length} OR code ILIKE $${queryParams.length})`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM workers ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get data
    const dataQuery = `
      SELECT * 
      FROM workers 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    const result = await pool.query(dataQuery, [...queryParams, limitInt, offsetInt]);
    
    res.json({
      data: result.rows,
      total,
      page: pageInt,
      limit: limitInt
    });
  } catch (error) {
    console.error("Get Workers Error:", error);
    res.status(500).json({ message: "Error retrieving workers", error });
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
