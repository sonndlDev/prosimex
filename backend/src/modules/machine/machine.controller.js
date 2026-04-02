import pool from '../../config/db.js'

export const getMachines = async (req, res) => {
  try {
    const { factory_id, page = 1, limit = 10, search = "" } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = (pageInt - 1) * limitInt;

    let whereClause = "WHERE m.deleted_at IS NULL";
    const queryParams = [];

    if (factory_id) {
      queryParams.push(factory_id);
      whereClause += ` AND m.factory_id = $${queryParams.length}`;
    }

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (m.name ILIKE $${queryParams.length} OR m.code ILIKE $${queryParams.length})`;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM machines m 
      LEFT JOIN factories f ON m.factory_id = f.id 
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get data
    const dataQuery = `
      SELECT m.*, f.name as factory_name, COALESCE(cu.full_name, cu.username) as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name
      FROM machines m 
      LEFT JOIN factories f ON m.factory_id = f.id
      LEFT JOIN users cu ON m.created_by = cu.id
      LEFT JOIN users mu ON m.modified_by = mu.id
      ${whereClause}
      ORDER BY m.created_at DESC
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
    console.error("Get Machines Error:", error);
    res.status(500).json({ message: "Error retrieving machines", error });
  }
};

export const createMachine = async (req, res) => {
  try {
    const { code, name, factory_id, capacity_per_day, is_active } = req.body
    const userId = req.user?.id;
    const result = await pool.query(
      `INSERT INTO machines (code, name, factory_id, capacity_per_day, is_active, created_by, modified_by) 
             VALUES ($1, $2, $3, $4, COALESCE($5, true), $6, $6) RETURNING *`,
      [code, name, factory_id, capacity_per_day, is_active, userId]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Machine code must be unique per factory' })
    }
    res.status(500).json({ message: 'Error creating machine', error })
  }
}

export const updateMachine = async (req, res) => {
  try {
    const { id } = req.params
    const { name, capacity_per_day, is_active } = req.body
    const userId = req.user?.id;
    const result = await pool.query(
      `UPDATE machines 
             SET name = COALESCE($1, name), 
                 capacity_per_day = COALESCE($2, capacity_per_day), 
                 is_active = COALESCE($3, is_active), 
                 updated_at = CURRENT_TIMESTAMP,
                 modified_by = $5,
                 modified_time = CURRENT_TIMESTAMP
             WHERE id = $4 AND deleted_at IS NULL RETURNING *`,
      [name, capacity_per_day, is_active, id, userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Machine not found' })
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Error updating machine', error })
  }
}

export const deleteMachine = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id;
    const result = await pool.query(
      'UPDATE machines SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL',
      [id, userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Machine not found' })
    res.json({ message: 'Machine deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting machine', error })
  }
}
