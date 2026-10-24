// backend/src/shared/base.repository.js
import pool from '../config/db.js';

export class BaseRepository {
  async query(text, params) {
    return pool.query(text, params);
  }

  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
