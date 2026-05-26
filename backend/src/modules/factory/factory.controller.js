import pool from '../../config/db.js'
import { cascadeOnFactoryDelete } from '../../utils/cascade-delete.util.js'

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

    const countResult = await pool.query(`SELECT COUNT(*) FROM factories ${whereClause}`, queryParams);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT factories.*, COALESCE(cu.full_name, cu.username) as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name
       FROM factories 
       LEFT JOIN users cu ON factories.created_by = cu.id
       LEFT JOIN users mu ON factories.modified_by = mu.id
       ${whereClause}
       ORDER BY factories.created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limitInt, offsetInt]
    );
    
    res.json({ data: result.rows, total, page: pageInt, limit: limitInt });
  } catch (error) {
    console.error("Get Factories Error:", error);
    res.status(500).json({ message: "Error retrieving factories", error });
  }
};

export const createFactory = async (req, res) => {
  try {
    const { name, location, is_active } = req.body;
    const userId = req.user?.id;

    const result = await pool.query(
      'INSERT INTO factories (name, location, is_active, created_by, modified_by) VALUES ($1, $2, $3, $4, $4) RETURNING *',
      [name, location || null, is_active !== undefined ? is_active : true, userId]
    );
    const newFactory = result.rows[0];

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'CREATE', 'Factory', $2, $3)`,
      [userId, newFactory.id, newFactory]
    );

    res.status(201).json(newFactory);
  } catch (error) {
    res.status(500).json({ message: 'Error creating factory', error });
  }
};

export const updateFactory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, is_active } = req.body;
    const userId = req.user?.id;

    const beforeRes = await pool.query('SELECT * FROM factories WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (beforeRes.rowCount === 0) return res.status(404).json({ message: 'Factory not found' });

    const result = await pool.query(
      'UPDATE factories SET name = COALESCE($1, name), location = COALESCE($2, location), is_active = COALESCE($3, is_active), updated_at = CURRENT_TIMESTAMP, modified_by = $5, modified_time = CURRENT_TIMESTAMP WHERE id = $4 AND deleted_at IS NULL RETURNING *',
      [name || null, location || null, is_active !== undefined ? is_active : null, id, userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Factory not found' });

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data) VALUES ($1, 'UPDATE', 'Factory', $2, $3, $4)`,
      [userId, id, beforeRes.rows[0], result.rows[0]]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update factory error:', error);
    res.status(500).json({ message: 'Error updating factory', error });
  }
};

export const deleteFactory = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const beforeRes = await client.query('SELECT * FROM factories WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (beforeRes.rowCount === 0) return res.status(404).json({ message: 'Factory not found' });

    await client.query('BEGIN');
    await cascadeOnFactoryDelete(client, id, userId);
    await client.query(
      'UPDATE factories SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1',
      [id, userId],
    );
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data) VALUES ($1, 'DELETE', 'Factory', $2, $3)`,
      [userId, id, beforeRes.rows[0]],
    );
    await client.query('COMMIT');

    res.json({ message: 'Factory deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error deleting factory', error });
  } finally {
    client.release();
  }
};
