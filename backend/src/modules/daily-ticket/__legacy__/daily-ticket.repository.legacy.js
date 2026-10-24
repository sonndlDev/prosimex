import { BaseRepository } from '~/shared/base.repository.js';

export class DailyTicketRepository extends BaseRepository {
  /**
   * Build dynamic WHERE clause from filters.
   * Returns { clause: string, params: array }
   */
  buildWhereClause(filters) {
    const { startDate, endDate, status, is_manual, created_by, ticket_code, operation_name, search, exclude_pending } = filters;

    let clause = "WHERE dt.deleted_at IS NULL AND (o.id IS NULL OR o.deleted_at IS NULL) AND (p.id IS NULL OR p.deleted_at IS NULL)";
    const params = [];

    if (startDate) {
      params.push(startDate);
      clause += ` AND dt.ticket_date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      clause += ` AND dt.ticket_date <= $${params.length}`;
    }
    if (status && status !== 'ALL') {
      params.push(status);
      clause += ` AND dt.status = $${params.length}`;
    } else if (exclude_pending === 'true') {
      clause += ` AND dt.status NOT IN ('PENDING_APPROVAL', 'REJECTED')`;
    }
    if (is_manual === 'true') {
      clause += ` AND dt.is_manual = true`;
    }
    if (created_by) {
      params.push(parseInt(created_by, 10));
      clause += ` AND dt.created_by = $${params.length}`;
    }
    if (ticket_code) {
      const match = ticket_code.match(/\d{8}(\d+)/);
      if (match) {
        params.push(match[1]);
        clause += ` AND CAST(dt.id AS TEXT) = $${params.length}`;
      } else {
        params.push(`%${ticket_code}%`);
        clause += ` AND CAST(dt.id AS TEXT) ILIKE $${params.length}`;
      }
    }
    if (operation_name) {
      params.push(`%${operation_name}%`);
      clause += ` AND (dti.operation_name ILIKE $${params.length} OR op.name ILIKE $${params.length})`;
    }
    if (search) {
      params.push(`%${search}%`);
      clause += ` AND (
        o.name ILIKE $${params.length} OR
        o.po_customer ILIKE $${params.length} OR
        p.name ILIKE $${params.length} OR
        CAST(dt.id AS TEXT) ILIKE $${params.length} OR
        cu.username ILIKE $${params.length} OR
        cu.full_name ILIKE $${params.length}
      )`;
    }

    return { clause, params };
  }

  async countTickets(filters) {
    const { clause, params } = this.buildWhereClause(filters);
    const result = await this.query(
      `SELECT COUNT(DISTINCT dt.id)
       FROM daily_production_tickets dt
       LEFT JOIN daily_production_ticket_items dti ON dti.ticket_id = dt.id
       LEFT JOIN orders o ON dti.order_id = o.id
       LEFT JOIN products p ON dti.product_id = p.id
       LEFT JOIN product_group_operations pgo ON dti.product_group_operation_id = pgo.id
       LEFT JOIN operations op ON pgo.operation_id = op.id
       LEFT JOIN users cu ON dt.created_by = cu.id
       ${clause}`,
      params
    );
    return parseInt(result.rows[0].count);
  }

  async findTickets(filters, { limit, offset }) {
    const { clause, params } = this.buildWhereClause(filters);
    const result = await this.query(
      `
            SELECT
                dt.id as id,
                dt.id as master_id,
                dt.status as ticket_status,
                dt.ticket_date,
                dt.is_manual,
                dt.created_by,
                dt.created_at,
                m.name as machine_name,
                STRING_AGG(DISTINCT o.name, ', ') as order_name,
                STRING_AGG(DISTINCT o.po_customer, ', ') as po_customer,
                STRING_AGG(DISTINCT p.name, ', ') as product_name,
                STRING_AGG(DISTINCT op.name, ', ') as fallback_operation_name,
                STRING_AGG(DISTINCT dti.operation_name, ', ') as operation_name,
                SUM(dti.planned_quantity) as planned_quantity,
                SUM(dti.actual_quantity) as actual_quantity,
                STRING_AGG(DISTINCT dti.notes, '; ') as notes,
                STRING_AGG(DISTINCT dti.actual_notes, '; ') as actual_notes,
                -- FIX #2: Nếu không có production_plan thì tính remaining = planned - actual từ items
                COALESCE(
                  MAX(pp.remaining_quantity),
                  SUM(dti.planned_quantity) - SUM(dti.actual_quantity)
                ) as remaining_quantity,
                COALESCE(cu.full_name, cu.username, 'Hệ thống') as creator_name,
                COALESCE(mu.full_name, mu.username) as modifier_name
            FROM daily_production_tickets dt
            LEFT JOIN daily_production_ticket_items dti ON dti.ticket_id = dt.id
            LEFT JOIN orders o ON dti.order_id = o.id
            LEFT JOIN products p ON dti.product_id = p.id
            LEFT JOIN product_group_operations pgo ON dti.product_group_operation_id = pgo.id
            LEFT JOIN operations op ON pgo.operation_id = op.id
            LEFT JOIN machines m ON dt.machine_id = m.id
            LEFT JOIN production_plans pp ON pp.id = COALESCE(
                dti.production_plan_id,
                (SELECT id FROM production_plans
                 WHERE order_id = dti.order_id
                   AND product_id = dti.product_id
                   AND product_group_operation_id = dti.product_group_operation_id
                   AND deleted_at IS NULL
                 LIMIT 1)
            )
            LEFT JOIN users cu ON dt.created_by = cu.id
            LEFT JOIN users mu ON dt.modified_by = mu.id
            ${clause}
            GROUP BY
                dt.id, dt.status, dt.ticket_date, dt.is_manual, dt.created_by, dt.created_at, m.name,
                cu.full_name, cu.username, mu.full_name, mu.username
            ORDER BY dt.ticket_date DESC, dt.id DESC
            LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
      [...params, limit, offset]
    );
    return result.rows;
  }

  async findById(id) {
    let ticketRes = await this.query(
      `SELECT dt.*, m.name as machine_name, COALESCE(cu.full_name, cu.username, 'Hệ thống') as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name
       FROM daily_production_tickets dt
       LEFT JOIN machines m ON dt.machine_id = m.id
       LEFT JOIN users cu ON dt.created_by = cu.id
       LEFT JOIN users mu ON dt.modified_by = mu.id
       WHERE dt.id = $1 AND dt.deleted_at IS NULL`,
      [id]
    );

    // [Refinement] If not found by ticket ID, check if it's an item ID
    if (ticketRes.rowCount === 0) {
      const itemFallback = await this.query(
        "SELECT ticket_id FROM daily_production_ticket_items WHERE id = $1",
        [id]
      );
      if (itemFallback.rowCount > 0) {
        const fallbackTicketId = itemFallback.rows[0].ticket_id;
        ticketRes = await this.query(
          `SELECT dt.*, COALESCE(cu.full_name, cu.username, 'Hệ thống') as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name
           FROM daily_production_tickets dt
           LEFT JOIN users cu ON dt.created_by = cu.id
           LEFT JOIN users mu ON dt.modified_by = mu.id
           WHERE dt.id = $1 AND dt.deleted_at IS NULL`,
          [fallbackTicketId]
        );
      }
    }

    if (ticketRes.rowCount === 0) {
      return null;
    }

    const ticket = ticketRes.rows[0];

    const itemsRes = await this.query(
      `SELECT dti.*,
              o.order_code, o.name as order_name, o.po_customer,
              c.code as customer_code,
              c.name as customer_name,
              p.name as product_name,
              pg.name as product_group_name,
              op.name as pgo_operation_name,
              op.description as operation_note,
              m.name as pgo_machine_name,
              pp.remaining_quantity,
              COALESCE(pp.dinh_muc, pgo.dinh_muc) as dinh_muc
       FROM daily_production_ticket_items dti
       LEFT JOIN orders o ON dti.order_id = o.id
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN products p ON dti.product_id = p.id
       LEFT JOIN product_groups pg ON p.product_group_id = pg.id
       LEFT JOIN product_group_operations pgo ON dti.product_group_operation_id = pgo.id
       LEFT JOIN operations op ON pgo.operation_id = op.id
       LEFT JOIN machines m ON pgo.machine_id = m.id
       LEFT JOIN production_plans pp ON pp.id = COALESCE(
            dti.production_plan_id,
            (SELECT id FROM production_plans
             WHERE order_id = dti.order_id
               AND product_id = dti.product_id
               AND product_group_operation_id = dti.product_group_operation_id
               AND deleted_at IS NULL
             LIMIT 1)
        )
       WHERE dti.ticket_id = $1`,
      [ticket.id]
    );

    return { ...ticket, items: itemsRes.rows };
  }

  async updateStatus(client, id, status, modifiedBy) {
    const result = await client.query(
      `UPDATE daily_production_tickets SET status = $2, updated_at = CURRENT_TIMESTAMP, modified_by = $3, modified_time = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id, status, modifiedBy]
    );
    return result.rows[0];
  }

  async findForUpdate(client, id) {
    const result = await client.query(
      "SELECT * FROM daily_production_tickets WHERE id = $1 AND deleted_at IS NULL",
      [id]
    );
    return result.rows[0] || null;
  }

  async insertNotification(client, { userId, message, link }) {
    await client.query(
      `INSERT INTO notifications (user_id, message, link) VALUES ($1, $2, $3)`,
      [userId, message, link]
    );
  }

  async insertAuditLog(client, { userId, action, entity, entityId, beforeData, afterData }) {
    if (beforeData !== undefined && afterData !== undefined) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, action, entity, entityId, beforeData, afterData]
      );
    } else if (beforeData !== undefined) {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, action, entity, entityId, beforeData]
      );
    } else {
      await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id)
         VALUES ($1, $2, $3, $4)`,
        [userId, action, entity, entityId]
      );
    }
  }
}

export const dailyTicketRepository = new DailyTicketRepository();
