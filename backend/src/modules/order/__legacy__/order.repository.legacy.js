import { BaseRepository } from '~/shared/base.repository.js';
import { ORDER_PRODUCT_JSON_FIELDS } from '~/utils/order-product-snapshot.util';


export class OrderRepository extends BaseRepository {
  /**
   * Build dynamic WHERE clause from filters object.
   * Returns { clause: string, params: array }
   */
  buildWhereClause(filters) {
    const {
      factory_id,
      search,
      status,
      customer_id,
      product_id,
      person_in_charge,
      location,
      startDate,
      endDate,
      dateType = 'received',
    } = filters;

    let whereClause = 'WHERE o.deleted_at IS NULL';
    const params = [];

    if (factory_id) {
      params.push(factory_id);
      whereClause += ` AND o.factory_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (o.name ILIKE $${params.length} OR o.order_code ILIKE $${params.length} OR c.name ILIKE $${params.length} OR o.po_customer ILIKE $${params.length})`;
    }

    if (status && status !== 'ALL') {
      if (status === 'INCOMPLETE') {
        whereClause += ` AND o.status != 'DONE'`;
      } else {
        params.push(status);
        whereClause += ` AND o.status = $${params.length}`;
      }
    }

    if (customer_id && customer_id !== 'ALL') {
      params.push(customer_id);
      whereClause += ` AND o.customer_id = $${params.length}`;
    }

    if (product_id && product_id !== 'ALL') {
      params.push(product_id);
      whereClause += ` AND EXISTS (
        SELECT 1 FROM order_products op_f
        JOIN products p_f ON op_f.product_id = p_f.id AND p_f.deleted_at IS NULL
        WHERE op_f.order_id = o.id AND op_f.product_id = $${params.length}
      )`;
    }

    if (person_in_charge) {
      params.push(`%${person_in_charge}%`);
      whereClause += ` AND o.person_in_charge ILIKE $${params.length}`;
    }

    if (location) {
      params.push(`%${location}%`);
      whereClause += ` AND o.production_location ILIKE $${params.length}`;
    }

    if (startDate && endDate) {
      if (dateType === 'shipping' || dateType === 'container') {
        let jsonbCol = dateType === 'shipping' ? 'oe.expected_shipping_date' : 'oe.expected_container_shipping_date';
        whereClause += ` AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(${jsonbCol}) d WHERE d::date >= $${params.length + 1} AND d::date <= $${params.length + 2})`;
        params.push(startDate);
        params.push(endDate);
      } else {
        let dateCol = 'o.received_date';
        if (dateType === 'production_start') dateCol = 'oe.production_start_date';

        params.push(startDate);
        whereClause += ` AND ${dateCol} >= $${params.length}`;
        params.push(endDate);
        whereClause += ` AND ${dateCol} <= $${params.length}`;
      }
    }

    return { clause: whereClause, params };
  }

  async countOrders(filters) {
    const { clause, params } = this.buildWhereClause(filters);
    const countQuery = `
      SELECT COUNT(*)
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN order_ext oe ON o.id = oe.order_id
      ${clause}
    `;
    const result = await this.query(countQuery, params);
    return parseInt(result.rows[0].count);
  }

  async findOrders(filters, { limitInt, offsetInt }) {
    const { clause, params } = this.buildWhereClause(filters);
    const dataQuery = `
      WITH product_stage_data AS (
        SELECT
          op.order_id,
          op.product_id,
          op.quantity as required,
          COALESCE(op.product_group_id, p_active.product_group_id) as effective_group_id,
          COALESCE(ss.has_xi_ma, psc.has_xi_ma, FALSE) as has_xi_ma,
          COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) as has_dong_goi,
          CASE
            WHEN COALESCE(ss.has_xi_ma, psc.has_xi_ma, FALSE) AND COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) THEN 4
            WHEN COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) THEN 2
            ELSE 0
          END as stage_count,
          COALESCE(ss.final_pgo_id, (
            SELECT pgo.id FROM product_group_operations pgo
            WHERE pgo.product_group_id = COALESCE(op.product_group_id, p_active.product_group_id)
            AND pgo.deleted_at IS NULL
            ORDER BY pgo.sequence_order DESC LIMIT 1
          ), NULL) as final_pgo_id
        FROM order_products op
        JOIN products p_active ON op.product_id = p_active.id AND p_active.deleted_at IS NULL
        LEFT JOIN product_stage_configs psc ON psc.product_id = op.product_id
          AND psc.product_group_id = COALESCE(op.product_group_id, p_active.product_group_id)
        LEFT JOIN order_product_snapshots ss ON ss.order_id = op.order_id AND ss.product_id = op.product_id
      ),
      product_actuals AS (
        SELECT
          psd.order_id,
          psd.product_id,
          psd.required,
          psd.stage_count,
          psd.has_xi_ma,
          psd.has_dong_goi,
          CASE WHEN psd.has_xi_ma THEN
            COALESCE((
              SELECT SUM(oti.quantity_out) FROM outsourcing_tickets ot
              JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
              WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
              AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
            ), 0)::numeric ELSE 0 END as xi_ma_di,
          CASE WHEN psd.has_xi_ma THEN
            COALESCE((
              SELECT SUM(or_t.quantity_returned) FROM outsourcing_returns or_t
              JOIN outsourcing_ticket_items oti ON or_t.ticket_item_id = oti.id
              JOIN outsourcing_tickets ot ON oti.ticket_id = ot.id
              WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
              AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
            ), 0)::numeric ELSE 0 END as xi_ma_ve,
          CASE WHEN psd.has_dong_goi THEN
            COALESCE((
              SELECT SUM(oti.quantity_out) FROM outsourcing_tickets ot
              JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
              WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
              AND ot.type = 'PACKAGING' AND ot.deleted_at IS NULL
            ), 0)::numeric ELSE 0 END as dong_goi,
          COALESCE((
            SELECT SUM(dti.actual_quantity) FROM daily_production_ticket_items dti
            JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
            WHERE dti.order_id = psd.order_id AND dti.product_id = psd.product_id
            AND dt.deleted_at IS NULL
            AND (psd.final_pgo_id IS NULL OR dti.product_group_operation_id = psd.final_pgo_id)
          ), 0)::numeric as sx
        FROM product_stage_data psd
      ),
      product_percentages AS (
        SELECT
          pa.order_id,
          pa.product_id,
          pa.required,
          pa.stage_count,
          CASE
            WHEN pa.stage_count = 4 THEN
              ROUND((LEAST(pa.xi_ma_di, pa.required) * 100.0 / NULLIF(pa.required, 0)
               + LEAST(pa.xi_ma_ve, pa.required) * 100.0 / NULLIF(pa.required, 0)
               + LEAST(pa.dong_goi, pa.required) * 100.0 / NULLIF(pa.required, 0)
               + LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0)) / 4.0, 2)
            WHEN pa.stage_count = 2 THEN
              ROUND((LEAST(pa.dong_goi, pa.required) * 100.0 / NULLIF(pa.required, 0)
               + LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0)) / 2.0, 2)
            WHEN pa.stage_count = 0 AND pa.required > 0 THEN
              ROUND(LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0), 2)
            ELSE 0
          END as product_percentage
        FROM product_actuals pa
      ),
      order_completion AS (
        SELECT
          order_id,
          ROUND(SUM(product_percentage) / COUNT(*), 2) as completion_percentage
        FROM product_percentages
        GROUP BY order_id
      )
      SELECT o.*, c.name as customer_name,
             COALESCE(cu.full_name, cu.username) as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name,
             oe.production_start_date, oe.expected_shipping_date, oe.expected_container_shipping_date, oe.customer_confirmation_result,
             oe.expected_material_date, oe.actual_material_date, oe.net_weight_text, oe.package_count_text, oe.container_volume_text,
              oe.pallet_info, oe.accessory_status, oe.packaging_spec,
             COALESCE(oc.completion_percentage, 0) as completion_percentage,
             COALESCE(
               (SELECT json_agg(json_build_object(${ORDER_PRODUCT_JSON_FIELDS}))
                FROM order_products op
                JOIN products p ON op.product_id = p.id AND p.deleted_at IS NULL
                LEFT JOIN product_groups pg_snap ON pg_snap.id = op.product_group_id AND pg_snap.deleted_at IS NULL
                LEFT JOIN product_groups pg_live ON pg_live.id = p.product_group_id AND pg_live.deleted_at IS NULL
                WHERE op.order_id = o.id),
               '[]'
             ) as products
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN users cu ON o.created_by = cu.id
      LEFT JOIN users mu ON o.modified_by = mu.id
      LEFT JOIN order_ext oe ON o.id = oe.order_id
      LEFT JOIN order_completion oc ON o.id = oc.order_id
      ${clause}
     ORDER BY
        CASE
          WHEN regexp_replace(o.po_auto_code, '[^\\d]', '', 'g') != ''
          THEN CAST(regexp_replace(o.po_auto_code, '[^\\d]', '', 'g') AS INTEGER)
          ELSE NULL
        END DESC NULLS LAST,
        o.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const result = await this.query(dataQuery, [...params, limitInt, offsetInt]);
    return result.rows;
  }

  async findById(id) {
    const dataQuery = `
      WITH product_stage_data AS (
        SELECT
          op.order_id,
          op.product_id,
          op.quantity as required,
          COALESCE(op.product_group_id, p_active.product_group_id) as effective_group_id,
          COALESCE(ss.has_xi_ma, psc.has_xi_ma, FALSE) as has_xi_ma,
          COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) as has_dong_goi,
          CASE
            WHEN COALESCE(ss.has_xi_ma, psc.has_xi_ma, FALSE) AND COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) THEN 4
            WHEN COALESCE(ss.has_dong_goi, psc.has_dong_goi, FALSE) THEN 2
            ELSE 0
          END as stage_count,
          COALESCE(ss.final_pgo_id, (
            SELECT pgo.id FROM product_group_operations pgo
            WHERE pgo.product_group_id = COALESCE(op.product_group_id, p_active.product_group_id)
            AND pgo.deleted_at IS NULL
            ORDER BY pgo.sequence_order DESC LIMIT 1
          ), NULL) as final_pgo_id
        FROM order_products op
        JOIN products p_active ON op.product_id = p_active.id AND p_active.deleted_at IS NULL
        LEFT JOIN product_stage_configs psc ON psc.product_id = op.product_id
          AND psc.product_group_id = COALESCE(op.product_group_id, p_active.product_group_id)
        LEFT JOIN order_product_snapshots ss ON ss.order_id = op.order_id AND ss.product_id = op.product_id
        WHERE op.order_id = $1
      ),
      product_actuals AS (
        SELECT
          psd.order_id,
          psd.product_id,
          psd.required,
          psd.stage_count,
          psd.has_xi_ma,
          psd.has_dong_goi,
          CASE WHEN psd.has_xi_ma THEN
            COALESCE((
              SELECT SUM(oti.quantity_out) FROM outsourcing_tickets ot
              JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
              WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
              AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
            ), 0)::numeric ELSE 0 END as xi_ma_di,
          CASE WHEN psd.has_xi_ma THEN
            COALESCE((
              SELECT SUM(or_t.quantity_returned) FROM outsourcing_returns or_t
              JOIN outsourcing_ticket_items oti ON or_t.ticket_item_id = oti.id
              JOIN outsourcing_tickets ot ON oti.ticket_id = ot.id
              WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
              AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
            ), 0)::numeric ELSE 0 END as xi_ma_ve,
          CASE WHEN psd.has_dong_goi THEN
            COALESCE((
              SELECT SUM(oti.quantity_out) FROM outsourcing_tickets ot
              JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
              WHERE oti.order_id = psd.order_id AND oti.product_id = psd.product_id
              AND ot.type = 'PACKAGING' AND ot.deleted_at IS NULL
            ), 0)::numeric ELSE 0 END as dong_goi,
          COALESCE((
            SELECT SUM(dti.actual_quantity) FROM daily_production_ticket_items dti
            JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
            WHERE dti.order_id = psd.order_id AND dti.product_id = psd.product_id
            AND dt.deleted_at IS NULL
            AND (psd.final_pgo_id IS NULL OR dti.product_group_operation_id = psd.final_pgo_id)
          ), 0)::numeric as sx
        FROM product_stage_data psd
      ),
      product_percentages AS (
        SELECT
          pa.order_id,
          pa.product_id,
          pa.required,
          pa.stage_count,
          CASE
            WHEN pa.stage_count = 4 THEN
              ROUND((LEAST(pa.xi_ma_di, pa.required) * 100.0 / NULLIF(pa.required, 0)
               + LEAST(pa.xi_ma_ve, pa.required) * 100.0 / NULLIF(pa.required, 0)
               + LEAST(pa.dong_goi, pa.required) * 100.0 / NULLIF(pa.required, 0)
               + LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0)) / 4.0, 2)
            WHEN pa.stage_count = 2 THEN
              ROUND((LEAST(pa.dong_goi, pa.required) * 100.0 / NULLIF(pa.required, 0)
               + LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0)) / 2.0, 2)
            WHEN pa.stage_count = 0 AND pa.required > 0 THEN
              ROUND(LEAST(pa.sx, pa.required) * 100.0 / NULLIF(pa.required, 0), 2)
            ELSE 0
          END as product_percentage
        FROM product_actuals pa
      ),
      order_completion AS (
        SELECT
          order_id,
          ROUND(SUM(product_percentage) / COUNT(*), 2) as completion_percentage
        FROM product_percentages
        GROUP BY order_id
      )
      SELECT o.*, c.name as customer_name,
             COALESCE(cu.full_name, cu.username) as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name,
             oe.production_start_date, oe.expected_shipping_date, oe.expected_container_shipping_date, oe.customer_confirmation_result,
             oe.expected_material_date, oe.actual_material_date, oe.net_weight_text, oe.package_count_text, oe.container_volume_text,
              oe.pallet_info, oe.accessory_status, oe.packaging_spec,
             COALESCE(oc.completion_percentage, 0) as completion_percentage,
             COALESCE(
               (SELECT json_agg(json_build_object(${ORDER_PRODUCT_JSON_FIELDS}))
                FROM order_products op
                JOIN products p ON op.product_id = p.id AND p.deleted_at IS NULL
                LEFT JOIN product_groups pg_snap ON pg_snap.id = op.product_group_id AND pg_snap.deleted_at IS NULL
                LEFT JOIN product_groups pg_live ON pg_live.id = p.product_group_id AND pg_live.deleted_at IS NULL
                WHERE op.order_id = o.id),
               '[]'
             ) as products
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN users cu ON o.created_by = cu.id
      LEFT JOIN users mu ON o.modified_by = mu.id
      LEFT JOIN order_ext oe ON o.id = oe.order_id
      LEFT JOIN order_completion oc ON o.id = oc.order_id
      WHERE o.id = $1 AND o.deleted_at IS NULL
    `;
    const result = await this.query(dataQuery, [id]);
    return result.rows[0] || null;
  }

  async findStatusById(id) {
    const result = await this.query(
      'SELECT status FROM orders WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return result.rows[0] || null;
  }

  async getCompletionReportDone(orderId) {
    const query = `
      WITH product_stages AS (
          SELECT
              ss.product_id,
              ss.total_stages,
              ss.final_pgo_id,
              ss.has_xi_ma,
              ss.has_dong_goi,
              ss.stage_count
          FROM order_product_snapshots ss
          WHERE ss.order_id = $1
      ),
      inhouse_totals AS (
        SELECT dti.product_id, dti.product_group_operation_id, SUM(dti.actual_quantity) as qty
        FROM daily_production_ticket_items dti
        JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
        WHERE dti.order_id = $1 AND dt.deleted_at IS NULL
        GROUP BY dti.product_id, dti.product_group_operation_id
      ),
      sx_totals AS (
        SELECT it.product_id, SUM(it.qty) as total_sx
        FROM inhouse_totals it
        JOIN product_stages ps ON ps.product_id = it.product_id
        WHERE ps.final_pgo_id IS NULL OR ps.final_pgo_id = it.product_group_operation_id
        GROUP BY it.product_id
      ),
      plating_totals AS (
        SELECT oti.product_id, SUM(oti.quantity_out) as total_plating_out
        FROM outsourcing_tickets ot
        JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
        WHERE oti.order_id = $1 AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
        GROUP BY oti.product_id
      ),
      plating_returns AS (
        SELECT oti.product_id, SUM(or_t.quantity_returned) as total_plating_returned
        FROM outsourcing_returns or_t
        JOIN outsourcing_ticket_items oti ON or_t.ticket_item_id = oti.id
        JOIN outsourcing_tickets ot ON oti.ticket_id = ot.id
        WHERE oti.order_id = $1 AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
        GROUP BY oti.product_id
      ),
      packaging_totals AS (
        SELECT oti.product_id, SUM(oti.quantity_out) as total_packaging_out
        FROM outsourcing_tickets ot
        JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
        WHERE oti.order_id = $1 AND ot.type = 'PACKAGING' AND ot.deleted_at IS NULL
        GROUP BY oti.product_id
      )
      SELECT
        p.id as product_id,
        COALESCE(op.product_name, p.name) as product_code,
        op.quantity as required_quantity,
        ps.total_stages,
        ps.stage_count,
        ps.has_xi_ma,
        ps.has_dong_goi,
        COALESCE(st.total_sx, 0) as sx_quantity,
        COALESCE(pt.total_plating_out, 0) as plating_out_quantity,
        COALESCE(pr.total_plating_returned, 0) as plating_returned_quantity,
        COALESCE(pkt.total_packaging_out, 0) as packaging_out_quantity,
        (SELECT COALESCE(SUM(pp2.inventory_input), 0) FROM production_plans pp2 WHERE pp2.order_id = $1 AND pp2.product_id = p.id AND pp2.deleted_at IS NULL AND (ps.final_pgo_id IS NULL OR pp2.product_group_operation_id = ps.final_pgo_id)) as inventory_input,
        (
          SELECT json_agg(json_build_object(
            'operation_name', snap_op->>'operation_name',
            'actual_quantity', CASE
              WHEN snap_op->>'operation_name' ILIKE '%ĐI MẠ%' OR snap_op->>'operation_name' ILIKE '%ĐI XI%' THEN COALESCE(pt.total_plating_out, 0)
              WHEN snap_op->>'operation_name' ILIKE '%VỀ MẠ%' OR snap_op->>'operation_name' ILIKE '%XI MẠ VỀ%' OR snap_op->>'operation_name' ILIKE '%VỀ XI%' THEN COALESCE(pr.total_plating_returned, 0)
              WHEN snap_op->>'operation_name' ILIKE '%ĐÓNG GÓI%' OR snap_op->>'operation_name' ILIKE '%ĐONG GOI%' THEN COALESCE(pkt.total_packaging_out, 0)
              ELSE COALESCE((SELECT ih.qty FROM inhouse_totals ih WHERE ih.product_group_operation_id = (snap_op->>'pgo_id')::int AND ih.product_id = p.id), 0)
            END,
            'configured', true
          ) ORDER BY (snap_op->>'sequence_order')::int ASC)
          FROM jsonb_array_elements(ss.operations_json) AS snap_op
        ) as operations_detail
      FROM order_products op
      JOIN products p ON op.product_id = p.id
      JOIN product_stages ps ON p.id = ps.product_id
      JOIN order_product_snapshots ss ON ss.order_id = op.order_id AND ss.product_id = op.product_id
      LEFT JOIN sx_totals st ON p.id = st.product_id
      LEFT JOIN plating_totals pt ON p.id = pt.product_id
      LEFT JOIN plating_returns pr ON p.id = pr.product_id
      LEFT JOIN packaging_totals pkt ON p.id = pkt.product_id
      WHERE op.order_id = $1
    `;
    const result = await this.query(query, [orderId]);
    return result.rows;
  }

  async getCompletionReportLive(orderId) {
    const query = `
      WITH product_stages AS (
          SELECT
              op.product_id,
              COALESCE(op.product_group_id, p.product_group_id) AS effective_group_id,
              (SELECT COUNT(*) FROM product_group_operations pgo WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id) AND pgo.deleted_at IS NULL) as total_stages,
              (SELECT pgo.id FROM product_group_operations pgo WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id) AND pgo.deleted_at IS NULL ORDER BY pgo.sequence_order DESC LIMIT 1) as final_pgo_id,
              COALESCE(psc.has_xi_ma, FALSE) as has_xi_ma,
              COALESCE(psc.has_dong_goi, FALSE) as has_dong_goi,
              CASE
                WHEN COALESCE(psc.has_xi_ma, FALSE) AND COALESCE(psc.has_dong_goi, FALSE) THEN 4
                WHEN COALESCE(psc.has_dong_goi, FALSE) THEN 2
                ELSE 0
              END as stage_count
          FROM order_products op
          JOIN products p ON op.product_id = p.id
          LEFT JOIN product_stage_configs psc ON psc.product_id = op.product_id
            AND psc.product_group_id = COALESCE(op.product_group_id, p.product_group_id)
          WHERE op.order_id = $1
      ),
      inhouse_totals AS (
        SELECT dti.product_id, dti.product_group_operation_id, SUM(dti.actual_quantity) as qty
        FROM daily_production_ticket_items dti
        JOIN daily_production_tickets dt ON dti.ticket_id = dt.id
        WHERE dti.order_id = $1 AND dt.deleted_at IS NULL
        GROUP BY dti.product_id, dti.product_group_operation_id
      ),
      sx_totals AS (
        SELECT it.product_id, SUM(it.qty) as total_sx
        FROM inhouse_totals it
        JOIN product_stages ps ON ps.product_id = it.product_id
        WHERE ps.final_pgo_id IS NULL OR ps.final_pgo_id = it.product_group_operation_id
        GROUP BY it.product_id
      ),
      plating_totals AS (
        SELECT oti.product_id, SUM(oti.quantity_out) as total_plating_out
        FROM outsourcing_tickets ot
        JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
        WHERE oti.order_id = $1 AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
        GROUP BY oti.product_id
      ),
      plating_returns AS (
        SELECT oti.product_id, SUM(or_t.quantity_returned) as total_plating_returned
        FROM outsourcing_returns or_t
        JOIN outsourcing_ticket_items oti ON or_t.ticket_item_id = oti.id
        JOIN outsourcing_tickets ot ON oti.ticket_id = ot.id
        WHERE oti.order_id = $1 AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
        GROUP BY oti.product_id
      ),
      packaging_totals AS (
        SELECT oti.product_id, SUM(oti.quantity_out) as total_packaging_out
        FROM outsourcing_tickets ot
        JOIN outsourcing_ticket_items oti ON ot.id = oti.ticket_id
        WHERE oti.order_id = $1 AND ot.type = 'PACKAGING' AND ot.deleted_at IS NULL
        GROUP BY oti.product_id
      )
      SELECT
        p.id as product_id,
        COALESCE(op.product_name, p.name) as product_code,
        op.quantity as required_quantity,
        ps.total_stages,
        ps.stage_count,
        ps.has_xi_ma,
        ps.has_dong_goi,
        COALESCE(st.total_sx, 0) as sx_quantity,
        COALESCE(pt.total_plating_out, 0) as plating_out_quantity,
        COALESCE(pr.total_plating_returned, 0) as plating_returned_quantity,
        COALESCE(pkt.total_packaging_out, 0) as packaging_out_quantity,
        (SELECT COALESCE(SUM(pp2.inventory_input), 0) FROM production_plans pp2 WHERE pp2.order_id = $1 AND pp2.product_id = p.id AND pp2.deleted_at IS NULL AND (ps.final_pgo_id IS NULL OR pp2.product_group_operation_id = ps.final_pgo_id)) as inventory_input,
        (
          SELECT json_agg(json_build_object(
            'operation_name', op_name.name,
            'actual_quantity', CASE
              WHEN op_name.name ILIKE '%ĐI MẠ%' OR op_name.name ILIKE '%ĐI XI%' THEN COALESCE(pt.total_plating_out, 0)
              WHEN op_name.name ILIKE '%VỀ MẠ%' OR op_name.name ILIKE '%XI MẠ VỀ%' OR op_name.name ILIKE '%VỀ XI%' THEN COALESCE(pr.total_plating_returned, 0)
              WHEN op_name.name ILIKE '%ĐÓNG GÓI%' OR op_name.name ILIKE '%ĐONG GOI%' THEN COALESCE(pkt.total_packaging_out, 0)
              ELSE COALESCE(ih.qty, 0)
            END,
            'configured', CASE WHEN pgo.id IS NOT NULL THEN true ELSE false END
          ) ORDER BY pgo.sequence_order ASC, op_name.name ASC)
          FROM operations op_name
          LEFT JOIN product_group_operations pgo ON pgo.operation_id = op_name.id
            AND pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id)
            AND pgo.deleted_at IS NULL
          LEFT JOIN inhouse_totals ih ON ih.product_group_operation_id = pgo.id AND ih.product_id = p.id
          WHERE op_name.deleted_at IS NULL
        ) as operations_detail
      FROM order_products op
      JOIN products p ON op.product_id = p.id
      JOIN product_stages ps ON p.id = ps.product_id
      LEFT JOIN sx_totals st ON p.id = st.product_id
      LEFT JOIN plating_totals pt ON p.id = pt.product_id
      LEFT JOIN plating_returns pr ON p.id = pr.product_id
      LEFT JOIN packaging_totals pkt ON p.id = pkt.product_id
      WHERE op.order_id = $1
    `;
    const result = await this.query(query, [orderId]);
    return result.rows;
  }

  async getProductSnapshots({ search, order_id, drift_only, limitInt, offsetInt }) {
    let whereClause = "WHERE o.deleted_at IS NULL AND o.status = 'DONE'";
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      const i = params.length;
      whereClause += ` AND (
        o.order_code ILIKE $${i} OR o.name ILIKE $${i}
        OR op.product_name ILIKE $${i} OR p.name ILIKE $${i}
        OR op.product_group_name ILIKE $${i}
      )`;
    }

    if (order_id) {
      params.push(order_id);
      whereClause += ` AND o.id = $${params.length}`;
    }

    if (drift_only === 'true' || drift_only === '1') {
      whereClause += ` AND (
        (op.product_name IS NOT NULL AND p.name IS DISTINCT FROM op.product_name)
        OR (op.product_group_id IS NOT NULL AND p.product_group_id IS DISTINCT FROM op.product_group_id)
      )`;
    }

    const countQuery = `
      SELECT COUNT(*)
      FROM order_products op
      JOIN orders o ON o.id = op.order_id
      JOIN products p ON p.id = op.product_id AND p.deleted_at IS NULL
      ${whereClause}
    `;
    const countResult = await this.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT
        (op.order_id::text || '-' || op.product_id::text) AS id,
        op.order_id,
        op.product_id,
        op.quantity,
        op.product_name AS snapshot_product_name,
        op.product_group_id AS snapshot_product_group_id,
        op.product_group_name AS snapshot_product_group_name,
        op.snapshot_at,
        p.name AS current_product_name,
        p.product_group_id AS current_product_group_id,
        pg_live.name AS current_product_group_name,
        o.order_code,
        o.name AS order_name,
        o.status AS order_status,
        c.name AS customer_name,
        (op.product_name IS NOT NULL AND p.name IS DISTINCT FROM op.product_name)
          OR (op.product_group_id IS NOT NULL AND p.product_group_id IS DISTINCT FROM op.product_group_id)
          AS has_master_drift
      FROM order_products op
      JOIN orders o ON o.id = op.order_id
      JOIN products p ON p.id = op.product_id AND p.deleted_at IS NULL
      LEFT JOIN product_groups pg_live ON pg_live.id = p.product_group_id AND pg_live.deleted_at IS NULL
      LEFT JOIN customers c ON c.id = o.customer_id AND c.deleted_at IS NULL
      ${whereClause}
      ORDER BY op.snapshot_at DESC NULLS LAST, o.order_code ASC, op.product_id ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const result = await this.query(dataQuery, [...params, limitInt, offsetInt]);
    return { rows: result.rows, total };
  }

  async insertOrder(client, data) {
    const {
      order_code,
      name,
      customer_id,
      firstProductId,
      po_customer,
      received_date,
      delivery_date,
      totalQuantity,
      production_location,
      person_in_charge,
      note,
      factory_id,
      created_by,
    } = data;

    const result = await client.query(
      `INSERT INTO orders
            (order_code, name, customer_id, product_id, po_customer,
             received_date, delivery_date, quantity, production_location,
             person_in_charge, note, factory_id, created_by, modified_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13) RETURNING id`,
      [
        order_code,
        name,
        customer_id,
        firstProductId,
        po_customer,
        received_date,
        delivery_date || null,
        totalQuantity,
        production_location,
        person_in_charge,
        note,
        factory_id,
        created_by,
      ],
    );
    return result.rows[0].id;
  }

  async updatePoAutoCode(client, orderId, poAutoCode) {
    const result = await client.query(
      'UPDATE orders SET po_auto_code = $1 WHERE id = $2 RETURNING *',
      [poAutoCode || null, orderId],
    );
    return result.rows[0];
  }

  async upsertOrderExt(client, orderId, extData) {
    const {
      production_start_date,
      expected_shipping_date,
      expected_container_shipping_date,
      customer_confirmation_result,
      pallet_info,
      accessory_status,
      expected_material_date,
      actual_material_date,
    } = extData;

    const shippingDateVal = Array.isArray(expected_shipping_date)
      ? JSON.stringify(expected_shipping_date)
      : JSON.stringify(expected_shipping_date ? [expected_shipping_date] : []);
    const containerDateVal = Array.isArray(expected_container_shipping_date)
      ? JSON.stringify(expected_container_shipping_date)
      : JSON.stringify(expected_container_shipping_date ? [expected_container_shipping_date] : []);

    await client.query(
      `INSERT INTO order_ext (order_id, production_start_date, expected_shipping_date, expected_container_shipping_date, customer_confirmation_result, pallet_info, accessory_status, expected_material_date, actual_material_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (order_id) DO UPDATE SET
         production_start_date = COALESCE(EXCLUDED.production_start_date, order_ext.production_start_date),
         expected_shipping_date = COALESCE(EXCLUDED.expected_shipping_date, order_ext.expected_shipping_date),
         expected_container_shipping_date = COALESCE(EXCLUDED.expected_container_shipping_date, order_ext.expected_container_shipping_date),
         customer_confirmation_result = COALESCE(EXCLUDED.customer_confirmation_result, order_ext.customer_confirmation_result),
         pallet_info = COALESCE(EXCLUDED.pallet_info, order_ext.pallet_info),
         accessory_status = COALESCE(EXCLUDED.accessory_status, order_ext.accessory_status),
         expected_material_date = COALESCE(EXCLUDED.expected_material_date, order_ext.expected_material_date),
         actual_material_date = COALESCE(EXCLUDED.actual_material_date, order_ext.actual_material_date)`,
      [
        orderId,
        production_start_date || null,
        shippingDateVal,
        containerDateVal,
        customer_confirmation_result || null,
        pallet_info || null,
        accessory_status || null,
        expected_material_date || null,
        actual_material_date || null,
      ],
    );
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

  async softDelete(client, id) {
    await client.query(
      'UPDATE orders SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id],
    );
  }

  async findForDelete(client, id) {
    const result = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return result.rows[0] || null;
  }
}

export const orderRepository = new OrderRepository();
