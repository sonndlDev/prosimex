import { db } from '../../shared/db/index.js';
import { SQL_FIND_DETAILED_ITEMS } from './queries/outsourcing.sql.js';

/**
 * Build WHERE clause and params for outsourcing_tickets queries.
 * @param {object} filters
 * @returns {{ clause: string, params: any[] }}
 */
function buildWhereClause(filters) {
  const { type, search, order_id, product_id, date } = filters;
  let clause = 'WHERE t.deleted_at IS NULL';
  const params = [];

  if (type) {
    params.push(type);
    clause += ` AND t.type = $${params.length}`;
  }

  if (search) {
    params.push(`%${search}%`);
    clause += ` AND (t.ticket_code ILIKE $${params.length} OR s.name ILIKE $${params.length})`;
  }

  if (order_id) {
    params.push(order_id);
    clause += ` AND i.order_id = $${params.length}`;
  }

  if (product_id) {
    params.push(product_id);
    clause += ` AND i.product_id = $${params.length}`;
  }

  if (date) {
    params.push(date);
    if (type === 'PACKAGING') {
      clause += ` AND DATE(t.created_at) = $${params.length}`;
    } else {
      clause += ` AND (DATE(t.dispatch_date) = $${params.length} OR DATE(t.created_at) = $${params.length})`;
    }
  }

  return { clause, params };
}

export const outsourcingService = {
  async getDetailedItems(filters) {
    const { clause, params } = buildWhereClause(filters);
    const { rows } = await db.query(
      `${SQL_FIND_DETAILED_ITEMS} ${clause} ORDER BY t.created_at DESC, i.id ASC`,
      params,
    );
    return rows;
  },
};
