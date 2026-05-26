import pool from "../config/db.js";

/**
 * Test Job: Tạo một công đoạn mới mỗi 5 phút
 * Format tên: SonNDL + count
 */
export async function createTestOperation() {
  try {
    // 1. Lấy số lượng công đoạn hiện có bắt đầu bằng 'SonNDL' để tính count
    const countRes = await pool.query(
      "SELECT COUNT(*) FROM operations WHERE name LIKE 'SonNDL%'"
    );
    const count = parseInt(countRes.rows[0].count) + 1;
    const opName = `SonNDL ${count}`;

    console.log(`[TestJob] Creating operation: ${opName}`);

    // 2. Insert vào bảng operations
    await pool.query(
      "INSERT INTO operations (name, description) VALUES ($1, $2)",
      [opName, "Công đoạn tạo tự động bởi Test Job"]
    );

    console.log(`[TestJob] Successfully created ${opName}`);
  } catch (error) {
    console.error("[TestJob] Error creating test operation:", error);
  }
}
