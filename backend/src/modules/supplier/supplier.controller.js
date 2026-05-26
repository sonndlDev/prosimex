import pool from "../../config/db.js";

export const getSuppliers = async (req, res) => {
  try {
    const { search = "" } = req.query;
    let query = "SELECT * FROM suppliers WHERE deleted_at IS NULL";
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (name ILIKE $1 OR code ILIKE $1)`;
    }
    query += " ORDER BY id DESC";
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách nhà cung cấp", error });
  }
};

export const createSupplier = async (req, res) => {
  try {
    const { code, name, phone, address } = req.body;
    if (!code || !name) {
      return res.status(400).json({ message: "Mã và Tên nhà cung cấp là bắt buộc" });
    }
    
    // Check if code exists
    const checkRes = await pool.query("SELECT * FROM suppliers WHERE code = $1", [code]);
    if (checkRes.rowCount > 0) {
      return res.status(400).json({ message: "Mã nhà cung cấp đã tồn tại" });
    }

    const insertRes = await pool.query(
      "INSERT INTO suppliers (code, name, phone, address) VALUES ($1, $2, $3, $4) RETURNING *",
      [code, name, phone, address]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi tạo nhà cung cấp", error });
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, phone, address } = req.body;

    // Check if code exists on another supplier
    const checkRes = await pool.query("SELECT * FROM suppliers WHERE code = $1 AND id != $2", [code, id]);
    if (checkRes.rowCount > 0) {
      return res.status(400).json({ message: "Mã nhà cung cấp đã tồn tại" });
    }
    
    const updateRes = await pool.query(
      "UPDATE suppliers SET code = $1, name = $2, phone = $3, address = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *",
      [code, name, phone, address, id]
    );
    if (updateRes.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy nhà cung cấp" });
    }
    res.json(updateRes.rows[0]);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật nhà cung cấp", error });
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if supplier is used in outsourcing_tickets
    const checkUsage = await pool.query("SELECT * FROM outsourcing_tickets WHERE supplier_id = $1 AND deleted_at IS NULL", [id]);
    if (checkUsage.rowCount > 0) {
        return res.status(400).json({ message: "Không thể xóa nhà cung cấp vì đã có phiếu xuất đi dùng nhà cung cấp này" });
    }

    const deleteRes = await pool.query(
      "UPDATE suppliers SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [id]
    );
    if (deleteRes.rowCount === 0) {
      return res.status(404).json({ message: "Không tìm thấy nhà cung cấp" });
    }
    res.json({ message: "Xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa nhà cung cấp", error });
  }
};
