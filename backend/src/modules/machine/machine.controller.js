import pool from '../../config/db.js'
import { cascadeOnMachineDelete } from '../../utils/cascade-delete.util.js'
import { getFactoriesByIds, buildFactoryMap } from '../../dal/factories.dal.js'
import { getUsersByIds, buildUserMap, userDisplayName } from '../../dal/users.dal.js'

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

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM machines m ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM machines m ${whereClause} ORDER BY sort_order ASC, name ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limitInt, offsetInt]
    );

    const rows = result.rows;
    if (rows.length > 0) {
      const factoryIds = [...new Set(rows.map(r => r.factory_id).filter(Boolean))];
      const userIds = [...new Set([...rows.map(r => r.created_by), ...rows.map(r => r.modified_by)].filter(Boolean))];
      const [factories, users] = await Promise.all([getFactoriesByIds(factoryIds), getUsersByIds(userIds)]);
      const factoryMap = buildFactoryMap(factories);
      const userMap = buildUserMap(users);
      rows.forEach(r => {
        r.factory_name = factoryMap[r.factory_id]?.name ?? null;
        r.creator_name = userDisplayName(userMap[r.created_by]) ?? null;
        r.modifier_name = userDisplayName(userMap[r.modified_by]) ?? null;
      });
    }

    res.json({ data: rows, total, page: pageInt, limit: limitInt });
  } catch (error) {
    console.error("Get Machines Error:", error);
    res.status(500).json({ message: "Error retrieving machines", error });
  }
};

export const createMachine = async (req, res) => {
  try {
    const { code, name, factory_id, capacity_per_day, is_active, sort_order, type, color } = req.body;
    const userId = req.user?.id;
    const result = await pool.query(
      `INSERT INTO machines (code, name, factory_id, capacity_per_day, is_active, sort_order, created_by, modified_by, type, color) 
       VALUES ($1, $2, $3, $4, COALESCE($5, true), $6, $7, $7, $8, $9) RETURNING *`,
      [code, name, factory_id, capacity_per_day, is_active, sort_order || 0, userId, type, color]
    );
    const newMachine = result.rows[0];

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'CREATE', 'Machine', $2, $3)`,
      [userId, newMachine.id, newMachine]
    );

    res.status(201).json(newMachine);
  } catch (error) {
    console.error("Create Machine Error:", error);
    if (error.code === '23505') return res.status(400).json({ message: 'Machine code must be unique per factory' });
    res.status(500).json({ message: 'Error creating machine', error: error.message });
  }
};

export const updateMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, factory_id, capacity_per_day, is_active, sort_order, type, color } = req.body;
    const userId = req.user?.id;

    console.log("UPDATE Machine Request:", { id, userId, body: req.body });

    const beforeRes = await pool.query('SELECT * FROM machines WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (beforeRes.rowCount === 0) return res.status(404).json({ message: 'Machine not found' });

    const updateValues = [
      code !== undefined ? code : beforeRes.rows[0].code,
      name !== undefined ? name : beforeRes.rows[0].name,
      factory_id !== undefined ? factory_id : beforeRes.rows[0].factory_id,
      capacity_per_day !== undefined ? capacity_per_day : beforeRes.rows[0].capacity_per_day,
      is_active !== undefined ? is_active : beforeRes.rows[0].is_active,
      sort_order !== undefined ? sort_order : beforeRes.rows[0].sort_order,
      type !== undefined ? type : beforeRes.rows[0].type,
      color !== undefined ? color : beforeRes.rows[0].color,
      id, 
      userId
    ];

    console.log("Final Update Values:", updateValues);

    const result = await pool.query(
      `UPDATE machines 
       SET code = $1,
           name = $2, 
           factory_id = $3,
           capacity_per_day = $4, 
           is_active = $5,
           sort_order = $6,
           type = $7,
           color = $8,
           updated_at = CURRENT_TIMESTAMP,
           modified_by = $10, 
           modified_time = CURRENT_TIMESTAMP
       WHERE id = $9 AND deleted_at IS NULL RETURNING *`,
      updateValues
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Machine not found' });

    console.log("UPDATE Machine Success:", result.rows[0]);

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data) VALUES ($1, 'UPDATE', 'Machine', $2, $3, $4)`,
      [userId, id, beforeRes.rows[0], result.rows[0]]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Update Machine Error:", error);
    if (error.code === '23505') return res.status(400).json({ message: 'Machine code must be unique per factory' });
    res.status(500).json({ message: 'Error updating machine', error: error.message });
  }
};

export const deleteMachine = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const beforeRes = await client.query('SELECT * FROM machines WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (beforeRes.rowCount === 0) return res.status(404).json({ message: 'Machine not found' });

    await client.query('BEGIN');
    await cascadeOnMachineDelete(client, id, userId);
    await client.query(
      'UPDATE machines SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1',
      [id, userId],
    );
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data) VALUES ($1, 'DELETE', 'Machine', $2, $3)`,
      [userId, id, beforeRes.rows[0]],
    );
    await client.query('COMMIT');

    res.json({ message: 'Machine deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error deleting machine', error });
  } finally {
    client.release();
  }
};
