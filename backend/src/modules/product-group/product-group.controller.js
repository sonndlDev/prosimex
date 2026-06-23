import pool from '../../config/db.js'
import { cascadeOnProductGroupDelete } from '../../utils/cascade-delete.util.js'

export const getProductGroups = async (req, res) => {
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
      whereClause += ` AND (name ILIKE $${queryParams.length})`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM product_groups ${whereClause}`;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get data
    const dataQuery = `
      SELECT pg.*, COALESCE(cu.full_name, cu.username) as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name
      FROM product_groups pg
      LEFT JOIN users cu ON pg.created_by = cu.id
      LEFT JOIN users mu ON pg.modified_by = mu.id
      ${whereClause.replace(/deleted_at/g, 'pg.deleted_at').replace(/factory_id/g, 'pg.factory_id').replace(/name/g, 'pg.name')}
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
    console.error("Get Product Groups Error:", error);
    res.status(500).json({ message: "Error retrieving product groups", error });
  }
};

export const createProductGroup = async (req, res) => {
  try {
    const { name, factory_id } = req.body;
    const userId = req.user?.id;
    const result = await pool.query(
      'INSERT INTO product_groups (name, factory_id, created_by, modified_by) VALUES ($1, $2, $3, $3) RETURNING *',
      [name, factory_id, userId]
    );
    const newGroup = result.rows[0];
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'CREATE', 'ProductGroup', $2, $3)`,
      [userId, newGroup.id, newGroup]
    );
    res.status(201).json(newGroup);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product group', error });
  }
}

export const updateProductGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const userId = req.user?.id;
    const beforeRes = await pool.query('SELECT * FROM product_groups WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (beforeRes.rowCount === 0) return res.status(404).json({ message: 'Product group not found' });
    const result = await pool.query(
      'UPDATE product_groups SET name = COALESCE($1, name), updated_at = CURRENT_TIMESTAMP, modified_by = $3, modified_time = CURRENT_TIMESTAMP WHERE id = $2 AND deleted_at IS NULL RETURNING *',
      [name, id, userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Product group not found' });
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data) VALUES ($1, 'UPDATE', 'ProductGroup', $2, $3, $4)`,
      [userId, id, beforeRes.rows[0], result.rows[0]]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product group', error });
  }
}

export const deleteProductGroup = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const beforeRes = await client.query('SELECT * FROM product_groups WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (beforeRes.rowCount === 0) return res.status(404).json({ message: 'Product group not found' });

    await client.query('BEGIN');
    await cascadeOnProductGroupDelete(client, id, userId);
    await client.query(
      'UPDATE product_groups SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1',
      [id, userId],
    );
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data) VALUES ($1, 'DELETE', 'ProductGroup', $2, $3)`,
      [userId, id, beforeRes.rows[0]],
    );
    await client.query('COMMIT');

    res.json({ message: 'Product group deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error deleting product group', error });
  } finally {
    client.release();
  }
}

// ========================================
// PRODUCT GROUP OPERATIONS (NESTED)
// ========================================

export const getProductGroupOperations = async (req, res) => {
  try {
    const { id } = req.params // product_group_id
    const { order_id, product_id } = req.query

    let query;
    let params;

    if (order_id && product_id) {
      query = `
        SELECT pgo.*, 
               o.name as operation_name, 
               (SELECT string_agg(m.name, ', ') FROM machines m WHERE m.id = ANY(pgo.machine_ids)) as machine_names,
               EXISTS (
                 SELECT 1 FROM production_plans pp
                 WHERE pp.product_group_operation_id = pgo.id
                   AND pp.order_id = $2
                   AND pp.product_id = $3
                   AND pp.deleted_at IS NULL
               ) as is_planned,
               COALESCE(
                 (SELECT SUM(dti.actual_quantity) 
                  FROM daily_production_ticket_items dti
                  JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
                  WHERE dt.deleted_at IS NULL
                    AND dti.order_id = $2
                    AND dti.product_id = $3
                    AND dti.product_group_operation_id = pgo.id),
                 0
               )::numeric as total_actual,
               COALESCE(
                 (SELECT op_qty.quantity 
                  FROM order_products op_qty 
                  WHERE op_qty.order_id = $2 
                    AND op_qty.product_id = $3
                  LIMIT 1),
                 0
               )::numeric as order_quantity
        FROM product_group_operations pgo
        LEFT JOIN operations o ON pgo.operation_id = o.id
        WHERE pgo.product_group_id = $1 AND pgo.deleted_at IS NULL
        ORDER BY pgo.sequence_order ASC`;
      params = [id, order_id, product_id];
    } else {
      query = `
        SELECT pgo.*, 
               o.name as operation_name, 
               (SELECT string_agg(m.name, ', ') FROM machines m WHERE m.id = ANY(pgo.machine_ids)) as machine_names,
               false as is_planned,
               0::numeric as total_actual,
               0::numeric as order_quantity
        FROM product_group_operations pgo
        LEFT JOIN operations o ON pgo.operation_id = o.id
        WHERE pgo.product_group_id = $1 AND pgo.deleted_at IS NULL
        ORDER BY pgo.sequence_order ASC`;
      params = [id];
    }

    const result = await pool.query(query, params);
    let rows = result.rows;

    // Tính thêm sản lượng manual (product_group_operation_id IS NULL)
    if (order_id && product_id) {
      const nullOpRes = await pool.query(`
        SELECT 
          COALESCE(SUM(dti.actual_quantity), 0)::numeric as total_actual,
          COALESCE(
            (SELECT op_qty.quantity FROM order_products op_qty
             WHERE op_qty.order_id = $1 AND op_qty.product_id = $2 LIMIT 1),
            0
          )::numeric as order_quantity
        FROM daily_production_ticket_items dti
        JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
        WHERE dt.deleted_at IS NULL
          AND dti.order_id = $1
          AND dti.product_id = $2
          AND dti.product_group_operation_id IS NULL
      `, [order_id, product_id]);

      const nullActualQty = parseFloat(nullOpRes.rows[0].total_actual) || 0;

      if (nullActualQty > 0) {
        rows = [
          ...rows,
          {
            id: null,
            product_group_id: id,
            operation_id: null,
            operation_name: "Không công đoạn",
            machine_names: null,
            machine_ids: null,
            sequence_order: null,
            dinh_muc: null,
            is_planned: false,
            total_actual: nullOpRes.rows[0].total_actual,
            order_quantity: nullOpRes.rows[0].order_quantity,
            deleted_at: null,
          }
        ];
      }
    }

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving operations for group', error })
  }
}

export const createProductGroupOperation = async (req, res) => {
  try {
    const { id } = req.params // product_group_id
    const { operation_id, machine_id, machine_ids, sequence_order, dinh_muc } = req.body

    // 1. Check for duplicate operation_id in the same group
    const duplicateCheck = await pool.query(
      'SELECT id FROM product_group_operations WHERE product_group_id = $1 AND operation_id = $2 AND deleted_at IS NULL',
      [id, operation_id]
    )
    if (duplicateCheck.rowCount > 0) {
      return res.status(400).json({ message: 'Công đoạn này đã tồn tại trong quy trình của nhóm này.' })
    }

    // 2. Check for duplicate operation NAME in the same group (in case of multiple IDs with same name)
    const nameCheck = await pool.query(
      `SELECT pgo.id FROM product_group_operations pgo
       JOIN operations o ON pgo.operation_id = o.id
       WHERE pgo.product_group_id = $1 
       AND o.name = (SELECT name FROM operations WHERE id = $2)
       AND pgo.deleted_at IS NULL`,
      [id, operation_id]
    )
    if (nameCheck.rowCount > 0) {
      return res.status(400).json({ message: 'Công đoạn có tên này đã tồn tại trong quy trình. Vui lòng không thêm trùng tên.' })
    }

    const m_ids = machine_ids || (machine_id ? [parseInt(machine_id)] : []);
    const primary_m_id = m_ids.length > 0 ? m_ids[0] : null;

    const result = await pool.query(
      `INSERT INTO product_group_operations 
             (product_group_id, operation_id, machine_id, machine_ids, sequence_order, dinh_muc) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, operation_id, primary_m_id, m_ids.length > 0 ? m_ids : null, sequence_order, dinh_muc ?? null]
    )
    const newOp = result.rows[0];
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'CREATE', 'ProductGroupOperation', $2, $3)`,
      [req.user.id, newOp.id, newOp]
    );
    res.status(201).json(newOp)
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Sequence order must be unique per product group' })
    }
    res.status(500).json({ message: 'Error mapping operation to group', error })
  }
}

export const deleteProductGroupOperation = async (req, res) => {
  try {
    const { id, operationId } = req.params // product_group_id, product_group_operation_id
    const result = await pool.query(
      'UPDATE product_group_operations SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND product_group_id = $2 AND deleted_at IS NULL',
      [operationId, id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Mapping not found' })
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES ($1, 'DELETE', 'ProductGroupOperation', $2)`,
      [req.user.id, operationId]
    );
    res.json({ message: 'Operation mapping deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Error deleting mapping', error })
  }
}

export const updateProductGroupOperation = async (req, res) => {
  try {
    const { id, operationId } = req.params
    const { operation_id, machine_id, machine_ids, sequence_order, dinh_muc } = req.body

    // If changing operation_id, check for duplicate ID and NAME
    if (operation_id) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM product_group_operations WHERE product_group_id = $1 AND operation_id = $2 AND id != $3 AND deleted_at IS NULL',
        [id, operation_id, operationId]
      )
      if (duplicateCheck.rowCount > 0) {
        return res.status(400).json({ message: 'Công đoạn này đã tồn tại trong quy trình của nhóm này.' })
      }

      const nameCheck = await pool.query(
        `SELECT pgo.id FROM product_group_operations pgo
         JOIN operations o ON pgo.operation_id = o.id
         WHERE pgo.product_group_id = $1 
         AND o.name = (SELECT name FROM operations WHERE id = $2)
         AND pgo.id != $3
         AND pgo.deleted_at IS NULL`,
        [id, operation_id, operationId]
      )
      if (nameCheck.rowCount > 0) {
        return res.status(400).json({ message: 'Công đoạn có tên này đã tồn tại trong quy trình. Vui lòng không thêm trùng tên.' })
      }
    }

    const m_ids = machine_ids || (machine_id ? [parseInt(machine_id)] : []);
    const primary_m_id = m_ids.length > 0 ? m_ids[0] : null;

    const result = await pool.query(
      `UPDATE product_group_operations 
       SET operation_id = COALESCE($1, operation_id),
           machine_id = $2,
           machine_ids = $3,
           sequence_order = COALESCE($4, sequence_order),
           dinh_muc = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND product_group_id = $7 AND deleted_at IS NULL
       RETURNING *`,
      [operation_id, primary_m_id, m_ids.length > 0 ? m_ids : null, sequence_order, dinh_muc ?? null, operationId, id]
    )
    if (result.rowCount === 0) return res.status(404).json({ message: 'Mapping not found' })
    const updatedOp = result.rows[0];
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'UPDATE', 'ProductGroupOperation', $2, $3)`,
      [req.user.id, updatedOp.id, updatedOp]
    );
    res.json(updatedOp)
  } catch (error) {
    res.status(500).json({ message: 'Error updating mapping', error })
  }
}

export const getStageConfigs = async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      `SELECT psc.*, p.name as product_name
       FROM product_stage_configs psc
       JOIN products p ON psc.product_id = p.id AND p.deleted_at IS NULL
       WHERE psc.product_group_id = $1
       ORDER BY p.name ASC`,
      [id]
    )
    const productsRes = await pool.query(
      `SELECT p.id, p.name FROM products p
       WHERE p.product_group_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.name ASC`,
      [id]
    )
    const configsMap = {}
    result.rows.forEach(r => { configsMap[r.product_id] = r })
    const data = productsRes.rows.map(p => ({
      product_id: p.id,
      product_name: p.name,
      product_group_id: parseInt(id),
      has_xi_ma: configsMap[p.id]?.has_xi_ma || false,
      has_dong_goi: configsMap[p.id]?.has_dong_goi || false,
    }))
    const opsCount = await pool.query(
      `SELECT COUNT(*) FROM product_group_operations WHERE product_group_id = $1 AND deleted_at IS NULL`,
      [id]
    )
    res.json({ data, has_operations: parseInt(opsCount.rows[0].count) > 0 })
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving stage configs', error })
  }
}

export const saveStageConfigs = async (req, res) => {
  const client = await pool.connect()
  try {
    const { id } = req.params
    const { configs } = req.body
    const userId = req.user?.id
    await client.query('BEGIN')
    for (const cfg of configs) {
      await client.query(
        `INSERT INTO product_stage_configs (product_id, product_group_id, has_xi_ma, has_dong_goi, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (product_id, product_group_id)
         DO UPDATE SET has_xi_ma = $3, has_dong_goi = $4, updated_at = CURRENT_TIMESTAMP`,
        [cfg.product_id, id, cfg.has_xi_ma || false, cfg.has_dong_goi || false]
      )
    }
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'UPDATE', 'ProductStageConfigs', $2, $3)`,
      [userId, id, JSON.stringify(configs)]
    )
    await client.query('COMMIT')
    res.json({ message: 'Stage configs saved successfully' })
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(500).json({ message: 'Error saving stage configs', error })
  } finally {
    client.release()
  }
}

export const exportProductGroups = async (req, res) => {
  try {
    const { factory_id } = req.query

    let whereClause = "WHERE pg.deleted_at IS NULL"
    const queryParams = []

    if (factory_id) {
      queryParams.push(factory_id)
      whereClause += ` AND pg.factory_id = $${queryParams.length}`
    }

    const query = `
      SELECT pg.id, pg.name as group_name,
             p.id as product_id, p.name as product_name,
             COALESCE(psc.has_xi_ma, false) as has_xi_ma,
             COALESCE(psc.has_dong_goi, false) as has_dong_goi,
             pgo.sequence_order,
             o.name as operation_name,
             (SELECT string_agg(m.name, ', ') FROM machines m WHERE m.id = ANY(pgo.machine_ids)) as machine_names,
             pgo.dinh_muc,
             COALESCE(cu.full_name, cu.username) as creator_name,
             COALESCE(mu.full_name, mu.username) as modifier_name,
             pg.created_at, pg.updated_at
      FROM product_groups pg
      LEFT JOIN products p ON p.product_group_id = pg.id AND p.deleted_at IS NULL
      LEFT JOIN product_stage_configs psc ON psc.product_id = p.id AND psc.product_group_id = pg.id
      LEFT JOIN product_group_operations pgo ON pgo.product_group_id = pg.id AND pgo.deleted_at IS NULL
      LEFT JOIN operations o ON pgo.operation_id = o.id
      LEFT JOIN users cu ON pg.created_by = cu.id
      LEFT JOIN users mu ON pg.modified_by = mu.id
      ${whereClause}
      ORDER BY pg.name ASC, p.name ASC, pgo.sequence_order ASC
    `
    const result = await pool.query(query, queryParams)
    res.json(result.rows)
  } catch (error) {
    console.error("Export Product Groups Error:", error)
    res.status(500).json({ message: "Error exporting product groups", error })
  }
}

export const reorderProductGroupOperations = async (req, res) => {
  const client = await pool.connect()
  try {
    const { id } = req.params // product_group_id
    const { orders } = req.body // Array of { id, sequence_order }
    
    await client.query('BEGIN')
    
    // To handle the unique constraint, first set them all to negative or high values if they conflict
    // Or just update them in one go in the transaction if possible.
    // A robust way is to set them to sequence_order + 1000 first, then set to real values.
    
    for (const item of orders) {
      await client.query(
        'UPDATE product_group_operations SET sequence_order = $1 WHERE id = $2 AND product_group_id = $3',
        [item.sequence_order + 1000, item.id, id]
      )
    }
    
    for (const item of orders) {
      await client.query(
        'UPDATE product_group_operations SET sequence_order = $1 WHERE id = $2 AND product_group_id = $3',
        [item.sequence_order, item.id, id]
      )
    }

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id) VALUES ($1, 'REORDER', 'ProductGroupOperations', $2)`,
      [req.user.id, id]
    );
    
    await client.query('COMMIT')
    res.json({ message: 'Reordered successfully' })
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(500).json({ message: 'Error reordering operations', error: error.message })
  } finally {
    client.release()
  }
}
