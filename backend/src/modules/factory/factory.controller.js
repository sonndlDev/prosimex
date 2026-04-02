import pool from '../../config/db.js'

export const getFactories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = (pageInt - 1) * limitInt;

    let whereClause = "WHERE factories.deleted_at IS NULL";
    const queryParams = [];

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (factories.name ILIKE $${queryParams.length} OR factories.location ILIKE $${queryParams.length})`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM factories ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get data
    const dataQuery = `
      SELECT factories.*, COALESCE(cu.full_name, cu.username) as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name
      FROM factories 
      LEFT JOIN users cu ON factories.created_by = cu.id
      LEFT JOIN users mu ON factories.modified_by = mu.id
      ${whereClause}
      ORDER BY factories.created_at DESC
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
    console.error("Get Factories Error:", error);
    res.status(500).json({ message: "Error retrieving factories", error });
  }
};

export const createFactory = async (req, res) => {
  try {
    const { name, location, is_active } = req.body
    const userId = req.user?.id;
    const result = await pool.query(
      'INSERT INTO factories (name, location, is_active, created_by, modified_by) VALUES ($1, $2, $3, $4, $4) RETURNING *',
      [name, location || null, is_active !== undefined ? is_active : true, userId]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ message: 'Error creating factory', error })
  }
}

export const updateFactory = async (req, res) => {
  try {
    const { id } = req.params
    const { name, location, is_active } = req.body
    const userId = req.user?.id;
    const result = await pool.query(
      'UPDATE factories SET name = COALESCE($1, name), location = COALESCE($2, location), is_active = COALESCE($3, is_active), updated_at = CURRENT_TIMESTAMP, modified_by = $5, modified_time = CURRENT_TIMESTAMP WHERE id = $4 AND deleted_at IS NULL RETURNING *',
      [name || null, location || null, is_active !== undefined ? is_active : null, id, userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Factory not found' })
    res.json(result.rows[0])
  } catch (error) {
    console.error('Update factory error:', error)
    res.status(500).json({ message: 'Error updating factory', error })
  }
}

export const deleteFactory = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.id;
    const result = await pool.query(
      'UPDATE factories SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL',
      [id, userId]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Factory not found' })
    res.json({ message: 'Factory deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting factory', error })
  }
}
