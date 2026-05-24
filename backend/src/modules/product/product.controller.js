import pool from '../../config/db.js'
import { cascadeOnProductDelete } from '../../utils/cascade-delete.util.js'

export const getProducts = async (req, res) => {
  try {
    const { factory_id, page = 1, limit = 10, search = "" } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = (pageInt - 1) * limitInt;

    let whereClause = "WHERE p.deleted_at IS NULL";
    const queryParams = [];
    if (factory_id) {
      queryParams.push(factory_id);
      whereClause += ` AND p.factory_id = $${queryParams.length}`;
    }
    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (p.name ILIKE $${queryParams.length} OR pg.name ILIKE $${queryParams.length})`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products p LEFT JOIN product_groups pg ON p.product_group_id = pg.id ${whereClause}`,
      queryParams
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.*, pg.name as product_group_name, COALESCE(cu.full_name, cu.username) as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name
       FROM products p 
       LEFT JOIN product_groups pg ON p.product_group_id = pg.id
       LEFT JOIN users cu ON p.created_by = cu.id
       LEFT JOIN users mu ON p.modified_by = mu.id
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
      [...queryParams, limitInt, offsetInt]
    );
    
    res.json({ data: result.rows, total, page: pageInt, limit: limitInt });
  } catch (error) {
    console.error("Get Products Error:", error);
    res.status(500).json({ message: "Error retrieving products", error });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { name, product_group_id, factory_id, is_active } = req.body;
    const userId = req.user?.id;

    const trimName = name?.trim() || "";
    if (!trimName) {
      return res.status(400).json({ message: 'Tên/Mã hàng không được để trống' });
    }

    const duplicateCheck = await pool.query(
      `SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
      [trimName]
    );

    if (duplicateCheck.rowCount > 0) {
      return res.status(400).json({ message: 'Mã hàng này đã tồn tại trong hệ thống.' });
    }

    const result = await pool.query(
      `INSERT INTO products (name, product_group_id, factory_id, is_active, created_by, modified_by) 
       VALUES ($1, $2, $3, COALESCE($4, true), $5, $5) RETURNING *`,
      [trimName, product_group_id, factory_id, is_active, userId]
    );
    const newProduct = result.rows[0];

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'CREATE', 'Product', $2, $3)`,
      [userId, newProduct.id, newProduct]
    );

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, product_group_id, is_active } = req.body;
    const userId = req.user?.id;

    if (name !== undefined) {
      const trimName = name?.trim() || "";
      if (!trimName) {
        return res.status(400).json({ message: 'Tên/Mã hàng không được để trống' });
      }
      
      const duplicateCheck = await pool.query(
        `SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER($1) AND id != $2 AND deleted_at IS NULL LIMIT 1`,
        [trimName, id]
      );
  
      if (duplicateCheck.rowCount > 0) {
        return res.status(400).json({ message: 'Mã hàng này đã tồn tại trong hệ thống.' });
      }
    }

    const beforeRes = await pool.query('SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (beforeRes.rowCount === 0) return res.status(404).json({ message: 'Product not found' });

    const result = await pool.query(
      `UPDATE products 
       SET name = COALESCE($1, name), product_group_id = COALESCE($2, product_group_id), 
           is_active = COALESCE($3, is_active), updated_at = CURRENT_TIMESTAMP,
           modified_by = $5, modified_time = CURRENT_TIMESTAMP
       WHERE id = $4 AND deleted_at IS NULL RETURNING *`,
      [name?.trim(), product_group_id, is_active, id, userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ message: 'Product not found' });

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data) VALUES ($1, 'UPDATE', 'Product', $2, $3, $4)`,
      [userId, id, beforeRes.rows[0], result.rows[0]]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error });
  }
};

export const deleteProduct = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const beforeRes = await client.query('SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (beforeRes.rowCount === 0) return res.status(404).json({ message: 'Product not found' });

    await client.query('BEGIN');
    await cascadeOnProductDelete(client, id, userId);
    await client.query(
      'UPDATE products SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1',
      [id, userId],
    );
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data) VALUES ($1, 'DELETE', 'Product', $2, $3)`,
      [userId, id, beforeRes.rows[0]],
    );
    await client.query('COMMIT');

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Error deleting product', error });
  } finally {
    client.release();
  }
};
