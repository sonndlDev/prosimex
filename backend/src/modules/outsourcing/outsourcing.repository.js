import { BaseRepository } from '~/shared/base.repository.js';

export class OutsourcingRepository extends BaseRepository {
  buildWhereClause(filters) {
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

  async findDetailedItems(filters) {
    const { clause, params } = this.buildWhereClause(filters);

    const dataQuery = `
      WITH returns_agg AS (
        SELECT
          r.ticket_item_id,
          MAX(r.returned_at) AS last_returned_at,
          SUM(r.quantity_returned) AS total_returned,
          SUM(r.accessory_quantity_returned) AS total_accessory_returned,
          SUM(r.gross_weight) AS return_gross_weight,
          SUM(r.pallet_weight) AS return_pallet_weight,
          SUM(r.net_weight) AS return_net_weight,
          SUM(r.missing_weight) AS return_missing_weight,
          string_agg(r.notes, '; ' ORDER BY r.returned_at) FILTER (WHERE r.notes IS NOT NULL AND r.notes != '') AS return_notes
        FROM outsourcing_returns r
        GROUP BY r.ticket_item_id
      )
      SELECT
        t.dispatch_date,
        t.ticket_code,
        COALESCE(NULLIF(BTRIM(CONCAT_WS(' - ', o.order_code, o.name)), ' - '), o.order_code, o.name) as order_display,
        p.name as product_name,
        i.order_quantity,
        i.processing_type,
        i.package_count,
        i.quantity_out,
        i.accessory_quantity,
        i.unit_net_weight,
        i.gross_weight,
        i.pallet_weight,
        i.net_weight,
        i.notes,
        t.expected_return_date,
        ra.last_returned_at,
        ra.total_returned,
        ra.total_accessory_returned,
        ra.return_gross_weight,
        ra.return_pallet_weight,
        ra.return_net_weight,
        ra.return_missing_weight,
        ra.return_notes
      FROM outsourcing_ticket_items i
      JOIN outsourcing_tickets t ON i.ticket_id = t.id
      LEFT JOIN suppliers s ON t.supplier_id = s.id
      LEFT JOIN orders o ON i.order_id = o.id
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN returns_agg ra ON ra.ticket_item_id = i.id
      ${clause}
      ORDER BY t.created_at DESC, i.id ASC
    `;

    const result = await this.query(dataQuery, params);
    return result.rows;
  }

  async insertAuditLog(client, { userId, action, entity, entityId, beforeData, afterData }) {
    if (beforeData !== undefined && afterData !== undefined) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, action, entity, entityId, beforeData, afterData],
      );
    } else if (beforeData !== undefined) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, action, entity, entityId, beforeData],
      );
    } else {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, action, entity, entityId, afterData],
      );
    }
  }
}

export const outsourcingRepository = new OutsourcingRepository();
