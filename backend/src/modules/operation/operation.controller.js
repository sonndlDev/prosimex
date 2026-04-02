import pool from '../../config/db.js'

export const getOperations = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = (pageInt - 1) * limitInt;

    let whereClause = "WHERE o.deleted_at IS NULL";
    const queryParams = [];
    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (o.name ILIKE $${queryParams.length})`;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM operations o ${whereClause}`, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT 
        o.*,
        COALESCE(json_agg(DISTINCT pg.name) FILTER (WHERE pg.name IS NOT NULL), '[]') as product_groups,
        COALESCE(cu.full_name, cu.username) as creator_name,
        COALESCE(mu.full_name, mu.username) as modifier_name
       FROM operations o
       LEFT JOIN product_group_operations pgo ON o.id = pgo.operation_id AND pgo.deleted_at IS NULL
       LEFT JOIN product_groups pg ON pgo.product_group_id = pg.id AND pg.deleted_at IS NULL
       LEFT JOIN users cu ON o.created_by = cu.id
       LEFT JOIN users mu ON o.modified_by = mu.id
       ${whereClause}
       GROUP BY o.id, cu.full_name, cu.username, mu.full_name, mu.username
       ORDER BY o.created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limitInt, offsetInt]
    );
    
    res.json({ data: result.rows, total, page: pageInt, limit: limitInt });
  } catch (error) {
    console.error("Get Operations Error:", error);
    res.status(500).json({ message: "Error retrieving operations", error });
  }
};

export const createOperation = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Tên công đoạn là bắt buộc' });

    const trimmedName = name.trim();
    const duplicateCheck = await pool.query(
      'SELECT id FROM operations WHERE LOWER(name) = LOWER($1) AND deleted_at IS NULL',
      [trimmedName]
    );
    if (duplicateCheck.rowCount > 0) return res.status(400).json({ message: 'Công đoạn này đã tồn tại trong danh mục.' });

    const userId = req.user?.id;
    const result = await pool.query(
      'INSERT INTO operations (name, description, created_by, modified_by) VALUES ($1, $2, $3, $3) RETURNING *',
      [trimmedName, description, userId]
    );
    const newOp = result.rows[0];

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'CREATE', 'Operation', $2, $3)`,
      [userId, newOp.id, newOp]
    );

    res.status(201).json(newOp);
  } catch (error) {
    res.status(500).json({ message: 'Error creating operation', error });
  }
};

export const updateOperation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (name) {
      const trimmedName = name.trim();
      const duplicateCheck = await pool.query(
        'SELECT id FROM operations WHERE LOWER(name) = LOWER($1) AND id != $2 AND deleted_at IS NULL',
        [trimmedName, id]
      );
      if (duplicateCheck.rowCount > 0) return res.status(400).json({ message: 'Tên công đoạn này đã tồn tại trong danh mục.' });
    }

    const userId = req.user?.id;
    const beforeRes = await pool.query('SELECT * FROM operations WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (beforeRes.rowCount === 0) return res.status(404).json({ message: 'Operation not found' });

    const result = await pool.query(
      'UPDATE operations SET name = COALESCE($1, name), description = COALESCE($2, description), updated_at = CURRENT_TIMESTAMP, modified_by = $4, modified_time = CURRENT_TIMESTAMP WHERE id = $3 AND deleted_at IS NULL RETURNING *',
      [name?.trim(), description, id, userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Operation not found' });

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data) VALUES ($1, 'UPDATE', 'Operation', $2, $3, $4)`,
      [userId, id, beforeRes.rows[0], result.rows[0]]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating operation', error });
  }
};

export const deleteOperation = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const beforeRes = await pool.query('SELECT * FROM operations WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (beforeRes.rowCount === 0) return res.status(404).json({ message: 'Operation not found' });

    await pool.query(
      'UPDATE operations SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1',
      [id, userId]
    );

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data) VALUES ($1, 'DELETE', 'Operation', $2, $3)`,
      [userId, id, beforeRes.rows[0]]
    );

    res.json({ message: 'Operation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting operation', error });
  }
};
