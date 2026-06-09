import pool from "../../config/db.js";
import {
  ORDER_PRODUCT_JSON_FIELDS,
  insertOrderProductWithSnapshot,
  refreshOrderProductSnapshots,
} from "../../utils/order-product-snapshot.util.js";

export const getOrders = async (req, res) => {
  try {
    const {
      factory_id,
      page = 1,
      limit = 10,
      search = "",
      startDate,
      endDate,
      dateType = "received",
      status,
      customer_id,
      product_id,
      person_in_charge,
      location,
    } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = (pageInt - 1) * limitInt;

    let whereClause = "WHERE o.deleted_at IS NULL";
    const queryParams = [];

    if (factory_id) {
      queryParams.push(factory_id);
      whereClause += ` AND o.factory_id = $${queryParams.length}`;
    }

    if (search) {
      queryParams.push(`%${search}%`);
      whereClause += ` AND (o.name ILIKE $${queryParams.length} OR o.order_code ILIKE $${queryParams.length} OR c.name ILIKE $${queryParams.length} OR o.po_customer ILIKE $${queryParams.length})`;
    }

    if (status && status !== "ALL") {
      if (status === "INCOMPLETE") {
        whereClause += ` AND o.status NOT IN ('DONE', 'CANCELLED')`;
      } else {
        queryParams.push(status);
        whereClause += ` AND o.status = $${queryParams.length}`;
      }
    }

    if (customer_id && customer_id !== "ALL") {
      queryParams.push(customer_id);
      whereClause += ` AND o.customer_id = $${queryParams.length}`;
    }

    if (product_id && product_id !== "ALL") {
      queryParams.push(product_id);
      whereClause += ` AND EXISTS (
        SELECT 1 FROM order_products op_f
        JOIN products p_f ON op_f.product_id = p_f.id AND p_f.deleted_at IS NULL
        WHERE op_f.order_id = o.id AND op_f.product_id = $${queryParams.length}
      )`;
    }

    if (person_in_charge) {
      queryParams.push(`%${person_in_charge}%`);
      whereClause += ` AND o.person_in_charge ILIKE $${queryParams.length}`;
    }

    if (location) {
      queryParams.push(`%${location}%`);
      whereClause += ` AND o.production_location ILIKE $${queryParams.length}`;
    }

    if (startDate && endDate) {
      if (dateType === "shipping" || dateType === "container") {
        let jsonbCol = dateType === "shipping" ? "oe.expected_shipping_date" : "oe.expected_container_shipping_date";
        whereClause += ` AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(${jsonbCol}) d WHERE d::date >= $${queryParams.length + 1} AND d::date <= $${queryParams.length + 2})`;
        queryParams.push(startDate);
        queryParams.push(endDate);
      } else {
        let dateCol = "o.received_date";
        if (dateType === "production_start") dateCol = "oe.production_start_date";
        
        queryParams.push(startDate);
        whereClause += ` AND ${dateCol} >= $${queryParams.length}`;
        queryParams.push(endDate);
        whereClause += ` AND ${dateCol} <= $${queryParams.length}`;
      }
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id AND c.deleted_at IS NULL
      LEFT JOIN order_ext oe ON o.id = oe.order_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get data with calculated completion percentage (includes joins needed for whereClause)
    const dataQuery = `
      WITH product_stage_data AS (
        SELECT 
          op.order_id,
          op.product_id,
          op.quantity as required,
          COALESCE(op.product_group_id, p_active.product_group_id) as effective_group_id,
          COALESCE(psc.has_xi_ma, FALSE) as has_xi_ma,
          COALESCE(psc.has_dong_goi, FALSE) as has_dong_goi,
          CASE
            WHEN COALESCE(psc.has_xi_ma, FALSE) AND COALESCE(psc.has_dong_goi, FALSE) THEN 4
            WHEN COALESCE(psc.has_dong_goi, FALSE) THEN 2
            ELSE 0
          END as stage_count,
          COALESCE((
            SELECT pgo.id FROM product_group_operations pgo 
            WHERE pgo.product_group_id = COALESCE(op.product_group_id, p_active.product_group_id) 
            AND pgo.deleted_at IS NULL
            ORDER BY pgo.sequence_order DESC LIMIT 1
          ), NULL) as final_pgo_id
        FROM order_products op
        JOIN products p_active ON op.product_id = p_active.id AND p_active.deleted_at IS NULL
        LEFT JOIN product_stage_configs psc ON psc.product_id = op.product_id 
          AND psc.product_group_id = COALESCE(op.product_group_id, p_active.product_group_id)
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
          CASE WHEN psd.has_dong_goi AND psd.final_pgo_id IS NOT NULL THEN
            COALESCE((
              SELECT SUM(dti.actual_quantity) FROM daily_production_ticket_items dti 
              JOIN daily_production_tickets dt ON dti.ticket_id = dt.id 
              WHERE dti.order_id = psd.order_id AND dti.product_id = psd.product_id 
              AND dti.product_group_operation_id = psd.final_pgo_id AND dt.deleted_at IS NULL
            ), 0)::numeric ELSE 0 END as cong_doan_cuoi
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
               + LEAST(pa.cong_doan_cuoi, pa.required) * 100.0 / NULLIF(pa.required, 0)) / 4.0, 2)
            WHEN pa.stage_count = 2 THEN
              ROUND((LEAST(pa.dong_goi, pa.required) * 100.0 / NULLIF(pa.required, 0)
               + LEAST(pa.cong_doan_cuoi, pa.required) * 100.0 / NULLIF(pa.required, 0)) / 2.0, 2)
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
             oe.pallet_info, oe.accessory_status,
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
      ${whereClause}
     ORDER BY CAST(o.po_auto_code AS INTEGER) DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const result = await pool.query(dataQuery, [
      ...queryParams,
      limitInt,
      offsetInt,
    ]);

    res.json({
      data: result.rows,
      total,
      page: pageInt,
      limit: limitInt,
    });
  } catch (error) {
    console.error("Get Orders Error:", error);
    res.status(500).json({ message: "Error retrieving orders", error });
  }
};


export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const dataQuery = `
      WITH product_stage_data AS (
        SELECT 
          op.order_id,
          op.product_id,
          op.quantity as required,
          COALESCE(op.product_group_id, p_active.product_group_id) as effective_group_id,
          COALESCE(psc.has_xi_ma, FALSE) as has_xi_ma,
          COALESCE(psc.has_dong_goi, FALSE) as has_dong_goi,
          CASE
            WHEN COALESCE(psc.has_xi_ma, FALSE) AND COALESCE(psc.has_dong_goi, FALSE) THEN 4
            WHEN COALESCE(psc.has_dong_goi, FALSE) THEN 2
            ELSE 0
          END as stage_count,
          COALESCE((
            SELECT pgo.id FROM product_group_operations pgo 
            WHERE pgo.product_group_id = COALESCE(op.product_group_id, p_active.product_group_id) 
            AND pgo.deleted_at IS NULL
            ORDER BY pgo.sequence_order DESC LIMIT 1
          ), NULL) as final_pgo_id
        FROM order_products op
        JOIN products p_active ON op.product_id = p_active.id AND p_active.deleted_at IS NULL
        LEFT JOIN product_stage_configs psc ON psc.product_id = op.product_id 
          AND psc.product_group_id = COALESCE(op.product_group_id, p_active.product_group_id)
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
          CASE WHEN psd.has_dong_goi AND psd.final_pgo_id IS NOT NULL THEN
            COALESCE((
              SELECT SUM(dti.actual_quantity) FROM daily_production_ticket_items dti 
              JOIN daily_production_tickets dt ON dti.ticket_id = dt.id 
              WHERE dti.order_id = psd.order_id AND dti.product_id = psd.product_id 
              AND dti.product_group_operation_id = psd.final_pgo_id AND dt.deleted_at IS NULL
            ), 0)::numeric ELSE 0 END as cong_doan_cuoi
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
               + LEAST(pa.cong_doan_cuoi, pa.required) * 100.0 / NULLIF(pa.required, 0)) / 4.0, 2)
            WHEN pa.stage_count = 2 THEN
              ROUND((LEAST(pa.dong_goi, pa.required) * 100.0 / NULLIF(pa.required, 0)
               + LEAST(pa.cong_doan_cuoi, pa.required) * 100.0 / NULLIF(pa.required, 0)) / 2.0, 2)
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
             oe.pallet_info, oe.accessory_status,
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

    const result = await pool.query(dataQuery, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get Order By Id Error:", error);
    res.status(500).json({ message: "Error retrieving order" });
  }
};

export const getOrderCompletionReport = async (req, res) => {
  try {
    const { id } = req.params;

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
        (
          SELECT json_agg(json_build_object(
            'operation_name', op_name.name,
            'actual_quantity', CASE
              WHEN op_name.name ILIKE '%ĐI MẠ%' OR op_name.name ILIKE '%ĐI XI%' THEN COALESCE(pt.total_plating_out, 0)
              WHEN op_name.name ILIKE '%VỀ MẠ%' OR op_name.name ILIKE '%XI MẠ VỀ%' OR op_name.name ILIKE '%VỀ XI%' THEN COALESCE(pr.total_plating_returned, 0)
              WHEN op_name.name ILIKE '%ĐÓNG GÓI%' OR op_name.name ILIKE '%ĐONG GOI%' THEN COALESCE(pkt.total_packaging_out, 0)
              ELSE COALESCE(ih.qty, 0)
            END
          ) ORDER BY pgo.sequence_order ASC)
          FROM product_group_operations pgo
          JOIN operations op_name ON pgo.operation_id = op_name.id
          LEFT JOIN inhouse_totals ih ON ih.product_group_operation_id = pgo.id AND ih.product_id = p.id
          WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id) AND pgo.deleted_at IS NULL
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

    const result = await pool.query(query, [id]);

    const data = result.rows.map(row => {
      const required = parseFloat(row.required_quantity) || 0;
      const sx = parseFloat(row.sx_quantity) || 0;
      const platingOut = parseFloat(row.plating_out_quantity) || 0;
      const platingReturned = parseFloat(row.plating_returned_quantity) || 0;
      const packagingOut = parseFloat(row.packaging_out_quantity) || 0;
      const stageCount = parseInt(row.stage_count) || 0;
      const hasXiMa = row.has_xi_ma;
      const hasDongGoi = row.has_dong_goi;
      const operationsDetail = row.operations_detail || [];

      const items = [];
      if (sx > 0) items.push(sx);
      if (platingOut > 0) items.push(platingOut);
      if (platingReturned > 0) items.push(platingReturned);
      if (packagingOut > 0) items.push(packagingOut);

      const completedQty = items.length > 0 ? items.reduce((a, b) => a + b, 0) / items.length : 0;

      let percentage = 0;
      if (stageCount === 4 && required > 0) {
        percentage = (Math.min(platingOut, required) * 100 / required
                    + Math.min(platingReturned, required) * 100 / required
                    + Math.min(packagingOut, required) * 100 / required
                    + Math.min(sx, required) * 100 / required) / 4;
      } else if (stageCount === 2 && required > 0) {
        percentage = (Math.min(packagingOut, required) * 100 / required
                    + Math.min(sx, required) * 100 / required) / 2;
      } else if (stageCount === 0 && required > 0) {
        percentage = Math.min(sx, required) * 100 / required;
      }
      percentage = Math.round(percentage * 100) / 100;

      return {
        ...row,
        sx_quantity: sx,
        plating_out_quantity: platingOut,
        plating_returned_quantity: platingReturned,
        packaging_out_quantity: packagingOut,
        completion_percentage: percentage,
        completed_quantity: completedQty
      };
    });

    const totalProducts = data.length;
    const totalCompletion = data.reduce((sum, r) => sum + r.completion_percentage, 0);
    const overallCompletionPercentage = totalProducts > 0 ? Math.round((totalCompletion / totalProducts) * 100) / 100 : 0;

    res.json({ data, overall_completion_percentage: overallCompletionPercentage });
  } catch (error) {
    console.error("Get Order Completion Report Error:", error);
    res.status(500).json({ message: "Error retrieving order completion report", error });
  }
};

export const getOrderSummaryReport = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if order exists
    const orderRes = await pool.query("SELECT id, po_auto_code FROM orders WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (orderRes.rowCount === 0) return res.status(404).json({ message: "Order not found" });

    // Complex query to get summary by identifying first and last stages for each product
    const query = `
      WITH product_stages AS (
          SELECT 
              op.product_id,
              COALESCE(op.product_group_id, p.product_group_id) AS effective_group_id,
              (SELECT pgo.id FROM product_group_operations pgo WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id) AND pgo.deleted_at IS NULL ORDER BY pgo.sequence_order ASC LIMIT 1) as start_pgo_id,
              (SELECT pgo.id FROM product_group_operations pgo WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id) AND pgo.deleted_at IS NULL ORDER BY pgo.sequence_order DESC LIMIT 1) as final_pgo_id,
              (SELECT o.name FROM product_group_operations pgo JOIN operations o ON pgo.operation_id = o.id WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id) AND pgo.deleted_at IS NULL ORDER BY pgo.sequence_order DESC LIMIT 1) as final_op_name
          FROM order_products op
          JOIN products p ON op.product_id = p.id
          WHERE op.order_id = $1
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
          COALESCE(op.product_name, p.name) as product_name,
          op.quantity as required_quantity,
          ps.final_op_name,
          COALESCE((SELECT SUM(dti.actual_quantity) FROM daily_production_ticket_items dti JOIN daily_production_tickets dt ON dt.id = dti.ticket_id WHERE dti.order_id = $1 AND dti.product_id = p.id AND dti.product_group_operation_id = ps.start_pgo_id AND dt.deleted_at IS NULL), 0) as started_quantity,
          COALESCE((SELECT SUM(dti.actual_quantity) FROM daily_production_ticket_items dti JOIN daily_production_tickets dt ON dt.id = dti.ticket_id WHERE dti.order_id = $1 AND dti.product_id = p.id AND dti.product_group_operation_id = ps.final_pgo_id AND dt.deleted_at IS NULL), 0) as finished_quantity,
          COALESCE((SELECT SUM(dti.actual_quantity) FROM daily_production_ticket_items dti JOIN daily_production_tickets dt ON dt.id = dti.ticket_id WHERE dti.order_id = $1 AND dti.product_id = p.id AND dt.deleted_at IS NULL), 0) as total_sx_quantity,
          COALESCE(pt.total_plating_out, 0) as plating_out_quantity,
          COALESCE(pr.total_plating_returned, 0) as plating_returned_quantity,
          COALESCE(pkt.total_packaging_out, 0) as packaging_out_quantity,
          (
            SELECT json_agg(json_build_object(
              'operation_name', op_name.name,
              'actual_quantity', COALESCE(op_totals.qty, 0)
            ) ORDER BY pgo.sequence_order ASC)
            FROM product_group_operations pgo
            JOIN operations op_name ON pgo.operation_id = op_name.id
            LEFT JOIN (
              SELECT dti.product_group_operation_id, SUM(dti.actual_quantity) as qty
              FROM daily_production_ticket_items dti
              JOIN daily_production_tickets dt ON dt.id = dti.ticket_id
              WHERE dti.order_id = $1 AND dti.product_id = p.id AND dt.deleted_at IS NULL AND dt.status IN ('APPROVED', 'COMPLETED')
              GROUP BY dti.product_group_operation_id
            ) op_totals ON op_totals.product_group_operation_id = pgo.id
            WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id) AND pgo.deleted_at IS NULL
          ) as operations_detail
      FROM order_products op
      JOIN products p ON op.product_id = p.id
      JOIN product_stages ps ON p.id = ps.product_id
      LEFT JOIN plating_totals pt ON p.id = pt.product_id
      LEFT JOIN plating_returns pr ON p.id = pr.product_id
      LEFT JOIN packaging_totals pkt ON p.id = pkt.product_id
      WHERE op.order_id = $1
    `;

    const result = await pool.query(query, [id]);
    
    const details = result.rows.map(row => {
      const finishedQty = parseFloat(row.finished_quantity || 0);
      const platingOutQty = parseFloat(row.plating_out_quantity || 0);
      const platingRetQty = parseFloat(row.plating_returned_quantity || 0);
      const packagingOutQty = parseFloat(row.packaging_out_quantity || 0);

      const items = [];
      if (finishedQty > 0) items.push(finishedQty);
      if (platingOutQty > 0) items.push(platingOutQty);
      if (platingRetQty > 0) items.push(platingRetQty);
      if (packagingOutQty > 0) items.push(packagingOutQty);

      const completedQty = items.length > 0 ? items.reduce((a, b) => a + b, 0) / items.length : 0;

      return {
        ...row,
        original_total_sx: row.total_sx_quantity,
        total_sx_quantity: completedQty 
      };
    });

    const totals = {
      required: details.reduce((sum, row) => sum + parseFloat(row.required_quantity || 0), 0),
      started: details.reduce((sum, row) => sum + parseFloat(row.started_quantity || 0), 0),
      finished: details.reduce((sum, row) => sum + parseFloat(row.finished_quantity || 0), 0),
      total_sx: details.reduce((sum, row) => sum + (row.total_sx_quantity || 0), 0)
    };

    res.json({
      order: orderRes.rows[0],
      totals,
      details
    });
  } catch (error) {
    console.error("Get Order Summary Report Error:", error);
    res.status(500).json({ message: "Error retrieving order summary report", error: error.message });
  }
};

export const createOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      order_code,
      name,
      customer_id,
      product_items,
      product_ids,
      po_customer,
      po_auto_code,
      received_date,
      delivery_date,
      quantity,
      production_location,
      person_in_charge,
      note,
      factory_id,
      production_start_date,
      expected_shipping_date,
      expected_container_shipping_date,
      customer_confirmation_result,
      pallet_info,
      accessory_status,
      expected_material_date,
      actual_material_date,
    } = req.body;

    const created_by = req.user.id; // From JWT Auth Middleware

    // Support both product_items (new) and product_ids (legacy)
    const items =
      product_items ||
      (product_ids
        ? product_ids.map((id) => ({ product_id: id, quantity: quantity || 0 }))
        : []);
    const totalQuantity =
      items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0) ||
      quantity ||
      0;

    // 1. Insert Order (legacy product_id filled with the first one)
    const firstProductId = items.length > 0 ? items[0].product_id : null;
    const insertRes = await client.query(
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

    const orderId = insertRes.rows[0].id;

    // 2. Insert Order Products with quantity + snapshot
    for (const item of items) {
      await insertOrderProductWithSnapshot(
        client,
        orderId,
        item.product_id,
        item.quantity,
      );
    }

    // Insert po_auto_code during creation directly, since it is now manual
    const updateRes = await client.query(
      "UPDATE orders SET po_auto_code = $1 WHERE id = $2 RETURNING *",
      [po_auto_code || null, orderId],
    );

    const newOrder = updateRes.rows[0];

    // 4. Insert into order_ext if provided
    if (production_start_date || expected_shipping_date || expected_container_shipping_date || customer_confirmation_result || pallet_info || accessory_status || expected_material_date || actual_material_date) {
      const shippingDateVal = Array.isArray(expected_shipping_date) ? JSON.stringify(expected_shipping_date) : JSON.stringify(expected_shipping_date ? [expected_shipping_date] : []);
      const containerDateVal = Array.isArray(expected_container_shipping_date) ? JSON.stringify(expected_container_shipping_date) : JSON.stringify(expected_container_shipping_date ? [expected_container_shipping_date] : []);
      
      await client.query(
        `INSERT INTO order_ext (order_id, production_start_date, expected_shipping_date, expected_container_shipping_date, customer_confirmation_result, pallet_info, accessory_status, expected_material_date, actual_material_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
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
        ]
      );
    }

    // Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
             VALUES ($1, 'CREATE', 'Order', $2, $3)`,
      [created_by, orderId, newOrder],
    );

    await client.query("COMMIT");
    res.status(201).json(newOrder);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res.status(400).json({ message: "Order code must be unique" });
    }
    console.error("Create Order Error:", error);
    res.status(500).json({ message: "Error creating order" });
  } finally {
    client.release();
  }
};

export const updateOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const {
      name,
      po_customer,
      received_date,
      delivery_date,
      quantity,
      production_location,
      person_in_charge,
      note,
      status,
      product_ids,
      product_items,
      po_auto_code,
      production_start_date,
      expected_shipping_date,
      expected_container_shipping_date,
      customer_confirmation_result,
      pallet_info,
      accessory_status,
      expected_material_date,
      actual_material_date,
      customer_id
    } = req.body;

    // Get Before Data for Audit Log
    const currentOrderRes = await client.query(
      "SELECT * FROM orders WHERE id = $1 AND deleted_at IS NULL",
      [id],
    );
    if (currentOrderRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }
    const beforeData = currentOrderRes.rows[0];
    const currentStatus = beforeData.status;
    const newStatus = status ?? currentStatus;

    if (
      currentStatus === "DONE" &&
      ((product_items && Array.isArray(product_items)) ||
        (typeof product_ids !== "undefined" && Array.isArray(product_ids)))
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Đơn hàng đã hoàn thành, không thể thay đổi danh sách mã hàng.",
      });
    }

    // po_auto_code is now manual, we take it directly from req.body
    let resolvedPoAutoCode = po_auto_code;
    if (resolvedPoAutoCode === undefined) {
      resolvedPoAutoCode = beforeData.po_auto_code;
    }

    // Sync Products - support both product_items (new) and product_ids (legacy)
    let totalQuantity = quantity;
    if (product_items && Array.isArray(product_items)) {
      await client.query("DELETE FROM order_products WHERE order_id = $1", [
        id,
      ]);
      for (const item of product_items) {
        await insertOrderProductWithSnapshot(
          client,
          id,
          item.product_id,
          item.quantity,
        );
      }
      totalQuantity = product_items.reduce(
        (sum, item) => sum + (parseFloat(item.quantity) || 0),
        0,
      );

      // Update legacy product_id
      if (product_items.length > 0) {
        await client.query("UPDATE orders SET product_id = $1 WHERE id = $2", [
          product_items[0].product_id,
          id,
        ]);
      }
    } else if (
      typeof product_ids !== "undefined" &&
      Array.isArray(product_ids)
    ) {
      await client.query("DELETE FROM order_products WHERE order_id = $1", [
        id,
      ]);
      for (const pId of product_ids) {
        await insertOrderProductWithSnapshot(client, id, pId, 0);
      }

      // Update legacy product_id
      if (product_ids.length > 0) {
        await client.query("UPDATE orders SET product_id = $1 WHERE id = $2", [
          product_ids[0],
          id,
        ]);
      }
    }

    const result = await client.query(
      `UPDATE orders 
             SET name = COALESCE($1, name), 
                 po_customer = COALESCE($2, po_customer),
                 po_auto_code = $3,
                 received_date = COALESCE($4, received_date),
                 delivery_date = $5,
                 quantity = COALESCE($6, quantity),
                 production_location = COALESCE($7, production_location),
                 person_in_charge = COALESCE($8, person_in_charge),
                 note = COALESCE($9, note),
                 status = COALESCE($10, status),
                 updated_at = CURRENT_TIMESTAMP,
                 modified_by = $12,
                 modified_time = CURRENT_TIMESTAMP,
                 customer_id = COALESCE($13, customer_id)
             WHERE id = $11 AND deleted_at IS NULL RETURNING *`,
      [
        name,
        po_customer,
        resolvedPoAutoCode,
        received_date,
        delivery_date || null,
        totalQuantity || quantity,
        production_location,
        person_in_charge,
        note,
        status,
        id,
        req.user.id,
        customer_id
      ],
    );

    const afterData = result.rows[0];

    if (newStatus === "DONE" && currentStatus !== "DONE") {
      await refreshOrderProductSnapshots(client, id);
    }

    // Update order_ext
    const shippingDateVal = Array.isArray(expected_shipping_date) ? JSON.stringify(expected_shipping_date) : JSON.stringify(expected_shipping_date ? [expected_shipping_date] : []);
    const containerDateVal = Array.isArray(expected_container_shipping_date) ? JSON.stringify(expected_container_shipping_date) : JSON.stringify(expected_container_shipping_date ? [expected_container_shipping_date] : []);
    
    await client.query(
      `INSERT INTO order_ext (order_id, production_start_date, expected_shipping_date, expected_container_shipping_date, customer_confirmation_result, pallet_info, accessory_status, expected_material_date, actual_material_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (order_id) DO UPDATE SET
         production_start_date = EXCLUDED.production_start_date,
         expected_shipping_date = EXCLUDED.expected_shipping_date,
         expected_container_shipping_date = EXCLUDED.expected_container_shipping_date,
         customer_confirmation_result = EXCLUDED.customer_confirmation_result,
         pallet_info = EXCLUDED.pallet_info,
         accessory_status = EXCLUDED.accessory_status,
         expected_material_date = EXCLUDED.expected_material_date,
         actual_material_date = EXCLUDED.actual_material_date`,
      [
        id,
        production_start_date || null,
        shippingDateVal,
        containerDateVal,
        customer_confirmation_result || null,
        pallet_info || null,
        accessory_status || null,
        expected_material_date || null,
        actual_material_date || null,
      ]
    );

    afterData.production_start_date = production_start_date || null;
    afterData.expected_shipping_date = expected_shipping_date || null;
    afterData.expected_container_shipping_date = expected_container_shipping_date || null;
    afterData.customer_confirmation_result = customer_confirmation_result || null;
    afterData.pallet_info = pallet_info || null;
    afterData.accessory_status = accessory_status || null;
    afterData.expected_material_date = expected_material_date || null;
    afterData.actual_material_date = actual_material_date || null;

    // Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
             VALUES ($1, 'UPDATE', 'Order', $2, $3, $4)`,
      [req.user.id, id, beforeData, afterData],
    );

    await client.query("COMMIT");
    res.json(afterData);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update Order Error:", error);
    res.status(500).json({ message: "Error updating order" });
  } finally {
    client.release();
  }
};

export const deleteOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;

    const currentOrderRes = await client.query(
      "SELECT * FROM orders WHERE id = $1 AND deleted_at IS NULL",
      [id],
    );
    if (currentOrderRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }
    const beforeData = currentOrderRes.rows[0];

    await client.query(
      "UPDATE orders SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id],
    );

    // Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data)
             VALUES ($1, 'DELETE', 'Order', $2, $3)`,
      [req.user.id, id, beforeData],
    );

    await client.query("COMMIT");
    res.json({ message: "Order deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Error deleting order", error });
  } finally {
    client.release();
  }
};

export const getOrderProductSnapshots = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      order_id,
      status,
      drift_only,
    } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = Math.min(parseInt(limit) || 20, 100);
    const offsetInt = (pageInt - 1) * limitInt;

    let whereClause = "WHERE o.deleted_at IS NULL";
    const queryParams = [];

    if (search) {
      queryParams.push(`%${search}%`);
      const i = queryParams.length;
      whereClause += ` AND (
        o.order_code ILIKE $${i} OR o.name ILIKE $${i}
        OR op.product_name ILIKE $${i} OR p.name ILIKE $${i}
        OR op.product_group_name ILIKE $${i}
      )`;
    }

    if (order_id) {
      queryParams.push(order_id);
      whereClause += ` AND o.id = $${queryParams.length}`;
    }

    if (status && status !== "ALL") {
      queryParams.push(status);
      whereClause += ` AND o.status = $${queryParams.length}`;
    }

    if (drift_only === "true" || drift_only === "1") {
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
    const countResult = await pool.query(countQuery, queryParams);
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
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const result = await pool.query(dataQuery, [
      ...queryParams,
      limitInt,
      offsetInt,
    ]);

    res.json({
      data: result.rows,
      total,
      page: pageInt,
      limit: limitInt,
    });
  } catch (error) {
    console.error("Get Order Product Snapshots Error:", error);
    res.status(500).json({ message: "Error retrieving order product snapshots" });
  }
};

export const updateWarehouseDetails = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      expected_material_date,
      actual_material_date,
      net_weight_text,
      package_count_text,
      container_volume_text
    } = req.body;

    await client.query("BEGIN");

    const orderRes = await client.query("SELECT id FROM orders WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (orderRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Order not found" });
    }

    await client.query(
      `INSERT INTO order_ext (
        order_id, 
        expected_material_date, 
        actual_material_date, 
        net_weight_text, 
        package_count_text, 
        container_volume_text
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (order_id) DO UPDATE SET
         expected_material_date = EXCLUDED.expected_material_date,
         actual_material_date = EXCLUDED.actual_material_date,
         net_weight_text = EXCLUDED.net_weight_text,
         package_count_text = EXCLUDED.package_count_text,
         container_volume_text = EXCLUDED.container_volume_text`,
      [
        id,
        expected_material_date || null,
        actual_material_date || null,
        net_weight_text || null,
        package_count_text || null,
        container_volume_text || null,
      ]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
             VALUES ($1, 'UPDATE_WAREHOUSE', 'Order', $2, $3)`,
      [req.user.id, id, { expected_material_date, actual_material_date, net_weight_text, package_count_text, container_volume_text }]
    );

    await client.query("COMMIT");
    res.json({ message: "Warehouse details updated successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update Warehouse Details Error:", error);
    res.status(500).json({ message: "Error updating warehouse details" });
  } finally {
    client.release();
  }
};
