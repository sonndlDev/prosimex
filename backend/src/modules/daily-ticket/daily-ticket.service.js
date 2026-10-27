/**
 * @file daily-ticket.service.js
 * Business logic for the daily-ticket module.
 *
 * Read methods classification:
 *   - getTickets  (Type C): paginated list with GROUP BY aggregates, STRING_AGG,
 *     correlated subquery on production_plans → SQL in queries/daily-ticket.sql.js
 *   - getTicketById (Type C): multi-table header + correlated subquery in items
 *     → SQL in queries/daily-ticket.sql.js
 *
 * Write methods (Type D — approve/reject):
 *   - Still delegated to dailyTicketRepository (write helpers: updateStatus,
 *     findForUpdate, insertNotification, insertAuditLog).
 *   - The repository is NOT used for any read queries.
 */

import { db } from '../../shared/db/index.js';
import { dailyTicketRepository } from './__legacy__/daily-ticket.repository.legacy.js';
import {
  SQL_TICKETS_COUNT,
  SQL_TICKETS_LIST,
  SQL_TICKETS_LIST_GROUP_ORDER,
  SQL_TICKET_BY_ID,
  SQL_TICKET_ID_FROM_ITEM,
  SQL_TICKET_BY_ID_NO_MACHINE,
  SQL_TICKET_ITEMS_BY_TICKET_ID,
} from './queries/daily-ticket.sql.js';

// ---------------------------------------------------------------------------
// Filter builder — pure function, no DB calls
// ---------------------------------------------------------------------------

/**
 * Build a dynamic WHERE clause from the provided filter object.
 * Returns { clause: string, params: Array }.
 *
 * @param {object} filters
 * @returns {{ clause: string, params: Array }}
 */
function buildWhereClause(filters) {
  const {
    startDate,
    endDate,
    status,
    is_manual,
    created_by,
    ticket_code,
    operation_name,
    search,
    exclude_pending,
    factory_id,
  } = filters;

  let clause =
    'WHERE dt.deleted_at IS NULL AND (o.id IS NULL OR o.deleted_at IS NULL) AND (p.id IS NULL OR p.deleted_at IS NULL)';
  const params = [];

  if (startDate) {
    params.push(startDate);
    clause += ` AND dt.ticket_date >= $${params.length}`;
  }
  if (endDate) {
    params.push(endDate);
    clause += ` AND dt.ticket_date <= $${params.length}`;
  }
  if (factory_id) {
    // Phiếu thuộc nhà máy nếu có item thuộc đơn hàng của nhà máy đó (subquery, không ảnh hưởng GROUP BY/aggregate)
    params.push(parseInt(factory_id, 10));
    clause += ` AND dt.id IN (SELECT dti_f.ticket_id FROM daily_production_ticket_items dti_f JOIN orders o_f ON dti_f.order_id = o_f.id WHERE o_f.factory_id = $${params.length})`;
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

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const dailyTicketService = {
  /**
   * Paginated ticket list.
   * Type C: GROUP BY aggregates + STRING_AGG + correlated subquery on production_plans.
   *
   * @param {object} filters
   * @param {{ limit: number, offset: number }} pagination
   * @returns {Promise<{ total: number, rows: Array }>}
   */
  async getTickets(filters, { limit, offset }) {
    const { clause, params } = buildWhereClause(filters);

    const [countRes, listRes] = await Promise.all([
      db.query(`${SQL_TICKETS_COUNT} ${clause}`, params),
      db.query(
        `${SQL_TICKETS_LIST} ${clause} ${SQL_TICKETS_LIST_GROUP_ORDER} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, limit, offset],
      ),
    ]);

    return {
      total: parseInt(countRes.rows[0].count),
      rows: listRes.rows,
    };
  },

  /**
   * Fetch a single ticket by ID (or by item ID as fallback).
   * Type C: multi-table header JOIN + correlated subquery in items query.
   *
   * @param {number|string} id
   * @returns {Promise<object|null>}
   */
  async getTicketById(id) {
    let ticketRes = await db.query(SQL_TICKET_BY_ID, [id]);

    // If not found by ticket ID, check if it's an item ID
    if (ticketRes.rowCount === 0) {
      const itemFallback = await db.query(SQL_TICKET_ID_FROM_ITEM, [id]);
      if (itemFallback.rowCount > 0) {
        const fallbackTicketId = itemFallback.rows[0].ticket_id;
        ticketRes = await db.query(SQL_TICKET_BY_ID_NO_MACHINE, [fallbackTicketId]);
      }
    }

    if (ticketRes.rowCount === 0) {
      return null;
    }

    const ticket = ticketRes.rows[0];
    const itemsRes = await db.query(SQL_TICKET_ITEMS_BY_TICKET_ID, [ticket.id]);

    return { ...ticket, items: itemsRes.rows };
  },

  /**
   * Approve a ticket (Type D — transactional write).
   * Delegates entirely to the legacy repository's write helpers.
   *
   * @param {number|string} id
   * @param {number|string} userId
   * @returns {Promise<{ ok: true }|{ notFound: true }|{ badRequest: true, message: string }>}
   */
  async approveTicket(id, userId) {
    return dailyTicketRepository.transaction(async (client) => {
      const ticket = await dailyTicketRepository.findForUpdate(client, id);
      if (!ticket) {
        return { notFound: true };
      }
      if (ticket.status === 'COMPLETED') {
        return { badRequest: true, message: 'Cannot approve a completed ticket!' };
      }

      await dailyTicketRepository.updateStatus(client, id, 'APPROVED', userId);

      await dailyTicketRepository.insertAuditLog(client, {
        userId,
        action: 'APPROVE',
        entity: 'DailyProductionTicket',
        entityId: id,
      });

      const ticketCreator = ticket.created_by;
      if (ticketCreator && ticketCreator !== userId) {
        await dailyTicketRepository.insertNotification(client, {
          userId: ticketCreator,
          message: `Phiếu sản xuất #${id} đã được DUYỆT`,
          link: '/daily-tickets',
        });
      }

      return { ok: true };
    });
  },

  /**
   * Reject a ticket (Type D — transactional write).
   * Delegates entirely to the legacy repository's write helpers.
   *
   * @param {number|string} id
   * @param {number|string} userId
   * @returns {Promise<{ ok: true }|{ notFound: true }|{ badRequest: true, message: string }>}
   */
  async rejectTicket(id, userId) {
    return dailyTicketRepository.transaction(async (client) => {
      const ticket = await dailyTicketRepository.findForUpdate(client, id);
      if (!ticket) {
        return { notFound: true };
      }
      if (ticket.status === 'COMPLETED') {
        return { badRequest: true, message: 'Cannot reject a completed ticket!' };
      }

      await dailyTicketRepository.updateStatus(client, id, 'REJECTED', userId);

      await dailyTicketRepository.insertAuditLog(client, {
        userId,
        action: 'REJECT',
        entity: 'DailyProductionTicket',
        entityId: id,
      });

      const ticketCreator = ticket.created_by;
      if (ticketCreator && ticketCreator !== userId) {
        await dailyTicketRepository.insertNotification(client, {
          userId: ticketCreator,
          message: `Phiếu sản xuất #${id} đã BỊ TỪ CHỐI`,
          link: '/daily-tickets',
        });
      }

      return { ok: true };
    });
  },
};
