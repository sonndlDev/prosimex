import pool from "../../config/db.js";

/**
 * POST /api/import-excel/master-data
 *
 * Mapping từ file Excel:
 *   - customer      → customers (code + name)
 *   - product_group → product_groups (name + factory_id + created_by + modified_by)
 *   - product       → products (name + product_group_id + factory_id + created_by + modified_by)
 *   - operation     → operations (name + created_by + modified_by)
 *   - dinh_muc      → product_group_operations (liên kết nhóm + công đoạn + thứ tự + định mức)
 *
 * Logic: kiểm tra → giữ nguyên nếu đã có / tạo mới nếu chưa có
 * Công đoạn được GOM vào đúng Product Group tương ứng.
 */
export const importMasterData = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = req.body;
    const userId = req.user?.id || null;

    if (!rows || rows.length === 0) {
      return res.status(400).json({ message: "Không có dữ liệu để import" });
    }

    // Lấy factory_id mặc định
    const factoryRes = await client.query(
      "SELECT id FROM factories WHERE deleted_at IS NULL ORDER BY id LIMIT 1"
    );
    const defaultFactoryId = factoryRes.rows[0]?.id || null;

    const summary = {
      customers: { created: 0, existing: 0 },
      product_groups: { created: 0, existing: 0 },
      operations: { created: 0, existing: 0 },
      products: { created: 0, existing: 0 },
      product_group_operations: { created: 0, existing: 0, updated: 0 },
    };

    // Cache nội bộ trong lần import này tránh lookup trùng
    const pgCache  = new Map(); // product_group name.lower  → id
    const opCache  = new Map(); // operation name.lower      → id
    const prdCache = new Map(); // product name.lower        → id

    // ────────────────────────────────────────────────────────────────
    for (const row of rows) {

      // ── 1. KHÁCH HÀNG ──────────────────────────────────────────────
      if (row.customer) {
        const trimName = row.customer.trim();
        const existing = await client.query(
          `SELECT id FROM customers
           WHERE LOWER(TRIM(name)) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
          [trimName]
        );
        if (existing.rows.length > 0) {
          summary.customers.existing++;
        } else {
          // code = TÊN_VIẾT_HOA dấu gạch dưới (max 90 ký tự)
          const code = trimName.toUpperCase().replace(/\s+/g, "_").substring(0, 90);
          await client.query(
            `INSERT INTO customers (code, name, is_active, created_by, modified_by)
             VALUES ($1, $2, true, $3, $3)
             ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
            [code, trimName, userId]
          );
          summary.customers.created++;
        }
      }

      // ── 2. NHÓM MÃ HÀNG ────────────────────────────────────────────
      let productGroupId = null;
      if (row.product_group) {
        const trimName = row.product_group.trim();
        const key = trimName.toLowerCase();

        if (pgCache.has(key)) {
          productGroupId = pgCache.get(key).id;
          summary.product_groups.existing++;
        } else {
          const existing = await client.query(
            `SELECT id FROM product_groups
             WHERE LOWER(TRIM(name)) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
            [trimName]
          );
          if (existing.rows.length > 0) {
            productGroupId = existing.rows[0].id;
            summary.product_groups.existing++;
          } else {
            const r = await client.query(
              `INSERT INTO product_groups (name, factory_id, created_by, modified_by)
               VALUES ($1, $2, $3, $3) RETURNING id`,
              [trimName, defaultFactoryId, userId]
            );
            productGroupId = r.rows[0].id;
            summary.product_groups.created++;
          }
          pgCache.set(key, { id: productGroupId });
        }
      }

      // ── 3. CÔNG ĐOẠN ───────────────────────────────────────────────
      let operationId = null;
      if (row.operation) {
        const trimName = row.operation.trim();
        const key = trimName.toLowerCase();

        if (opCache.has(key)) {
          operationId = opCache.get(key);
          summary.operations.existing++;
        } else {
          const existing = await client.query(
            `SELECT id FROM operations
             WHERE LOWER(TRIM(name)) = LOWER($1) AND deleted_at IS NULL LIMIT 1`,
            [trimName]
          );
          if (existing.rows.length > 0) {
            operationId = existing.rows[0].id;
            summary.operations.existing++;
          } else {
            const r = await client.query(
              `INSERT INTO operations (name, created_by, modified_by)
               VALUES ($1, $2, $2) RETURNING id`,
              [trimName, userId]
            );
            operationId = r.rows[0].id;
            summary.operations.created++;
          }
          opCache.set(key, operationId);
        }
      }

      // ── 4. SẢN PHẨM (MÃ HÀNG) ─────────────────────────────────────
      if (row.product) {
        const trimName = row.product.trim();
        const key = trimName.toLowerCase();

        if (prdCache.has(key)) {
          summary.products.existing++;
          const cachedPrd = prdCache.get(key);
          
          if (productGroupId) {
             if (cachedPrd.product_group_id && cachedPrd.product_group_id !== productGroupId) {
               throw new Error(`Mã hàng "${trimName}" đã tồn tại ở nhóm mã khác. Từ chối import vì 1 mã hàng chỉ có 1 nhóm!`);
             }
             if (!cachedPrd.product_group_id) {
               await client.query(`UPDATE products SET product_group_id = $1, updated_at = NOW() WHERE id = $2`, [productGroupId, cachedPrd.id]);
               cachedPrd.product_group_id = productGroupId;
             }
          }
        } else {
          const existing = await client.query(
            `SELECT p.id, p.product_group_id, pg.name as group_name
             FROM products p
             LEFT JOIN product_groups pg ON p.product_group_id = pg.id
             WHERE LOWER(TRIM(p.name)) = LOWER($1) AND p.deleted_at IS NULL LIMIT 1`,
            [trimName]
          );
          
          if (existing.rows.length > 0) {
            const extPrd = existing.rows[0];
            
            if (productGroupId) {
              if (extPrd.product_group_id && extPrd.product_group_id !== productGroupId) {
                throw new Error(`Mã hàng "${trimName}" đã tồn tại và thuộc nhóm mã "${extPrd.group_name || 'Khác'}". Không thể cập nhật sang nhóm mã mới, một mã hàng chỉ được gắn với một nhóm mã!`);
              }
              if (!extPrd.product_group_id) {
                await client.query(`UPDATE products SET product_group_id = $1, updated_at = NOW(), modified_by = $3 WHERE id = $2`, [productGroupId, extPrd.id, userId]);
                extPrd.product_group_id = productGroupId;
              }
            }
            
            prdCache.set(key, { id: extPrd.id, product_group_id: extPrd.product_group_id });
            summary.products.existing++;
          } else {
            const r = await client.query(
              `INSERT INTO products (name, product_group_id, factory_id, is_active, created_by, modified_by)
               VALUES ($1, $2, $3, true, $4, $4) RETURNING id`,
              [trimName, productGroupId, defaultFactoryId, userId]
            );
            prdCache.set(key, { id: r.rows[0].id, product_group_id: productGroupId });
            summary.products.created++;
          }
        }
      }

      // ── 5. QUY TRÌNH NHÓM MÃ (product_group_operations) ───────────
      // Gom công đoạn vào đúng nhóm mã hàng (đã tồn tại hoặc vừa tạo)
      if (productGroupId && operationId) {
        const dinhMuc = row.dinh_muc ? parseFloat(row.dinh_muc) : null;
        let rowIndex = null;
        if (row.stt && !isNaN(parseInt(row.stt))) {
          rowIndex = parseInt(row.stt);
        }

        // Kiểm tra cặp (product_group_id, operation_id)
        const existing = await client.query(
          `SELECT id, dinh_muc, sequence_order FROM product_group_operations
           WHERE product_group_id = $1 AND operation_id = $2 AND deleted_at IS NULL
           LIMIT 1`,
          [productGroupId, operationId]
        );

        if (existing.rows.length > 0) {
          const isDinhMucChanged = dinhMuc !== null && parseFloat(existing.rows[0].dinh_muc) !== dinhMuc;
          const isSequenceChanged = rowIndex !== null && parseInt(existing.rows[0].sequence_order) !== rowIndex;
          
          if (isDinhMucChanged || isSequenceChanged) {
            await client.query(
              `UPDATE product_group_operations
               SET dinh_muc = COALESCE($1, dinh_muc),
                   sequence_order = COALESCE($2, sequence_order),
                   updated_at = NOW()
               WHERE id = $3`,
              [dinhMuc, rowIndex, existing.rows[0].id]
            );
            summary.product_group_operations.updated++;
          } else {
            summary.product_group_operations.existing++;
          }
        } else {
          let nextSeq = rowIndex;
          if (nextSeq === null) {
            // Lấy sequence_order tiếp theo trong nhóm
            const seqRes = await client.query(
              `SELECT COALESCE(MAX(sequence_order), 0) + 1 AS next_seq
               FROM product_group_operations WHERE product_group_id = $1`,
              [productGroupId]
            );
            nextSeq = seqRes.rows[0].next_seq;
          }

          await client.query(
            `INSERT INTO product_group_operations
             (product_group_id, operation_id, machine_id, machine_ids, sequence_order, dinh_muc)
             VALUES ($1, $2, NULL, NULL, $3, $4)`,
            [productGroupId, operationId, nextSeq, dinhMuc]
          );
          summary.product_group_operations.created++;
        }
      }
    }
    // ────────────────────────────────────────────────────────────────

    // Include audit log to track the import action
    if (userId) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
         VALUES ($1, 'IMPORT', 'MasterData', 0, $2)`,
        [userId, JSON.stringify({ summary, rows })]
      );
    }
    await client.query("COMMIT");

    res.status(201).json({
      message: `Import thành công ${rows.length} dòng vào dữ liệu gốc.`,
      summary,
    });
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    console.error("Import Master Data Error:", error);
    res.status(500).json({ message: "Lỗi import: " + error.message });
  } finally {
    client.release();
  }
};

export const getImportHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.action = 'IMPORT' AND a.entity = 'MasterData'
    `;
    const params = [];

    if (search) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(u.username) LIKE $${params.length} OR LOWER(u.full_name) LIKE $${params.length})`;
    }

    const totalRes = await pool.query(`SELECT COUNT(*) ${query}`, params);
    const total = parseInt(totalRes.rows[0].count);

    const dataQuery = `
      SELECT a.*, u.username, u.full_name
      ${query}
      ORDER BY a.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const dataRes = await pool.query(dataQuery, [...params, limit, offset]);

    res.json({
      data: dataRes.rows,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Get Import History Error:", error);
    res.status(500).json({ message: "Lỗi lấy lịch sử." });
  }
};
