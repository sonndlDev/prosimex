// TEMPORARY: Functions not yet refactored — remove after full extraction to service/repository
import pool from '../../config/db.js';
import {
  ORDER_PRODUCT_JSON_FIELDS,
  insertOrderProductWithSnapshot,
  refreshOrderProductSnapshots,
  snapshotOrderProducts,
} from '../../utils/order-product-snapshot.util.js';

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

    if (newStatus === 'DONE' && currentStatus !== 'DONE') {
      await refreshOrderProductSnapshots(client, id)
      await snapshotOrderProducts(client, id)
    }

    // Update order_ext
    const shippingDateVal = 'expected_shipping_date' in req.body
      ? (Array.isArray(expected_shipping_date) ? JSON.stringify(expected_shipping_date) : JSON.stringify(expected_shipping_date ? [expected_shipping_date] : []))
      : null;
    const containerDateVal = 'expected_container_shipping_date' in req.body
      ? (Array.isArray(expected_container_shipping_date) ? JSON.stringify(expected_container_shipping_date) : JSON.stringify(expected_container_shipping_date ? [expected_container_shipping_date] : []))
      : null;

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

export const updateWarehouseDetails = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const {
      expected_material_date,
      actual_material_date,
      net_weight_text,
      package_count_text,
      container_volume_text,
      pallet_info,
      accessory_status,
      packaging_spec
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
        container_volume_text,
        pallet_info,
        accessory_status,
        packaging_spec
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (order_id) DO UPDATE SET
         expected_material_date = EXCLUDED.expected_material_date,
         actual_material_date = EXCLUDED.actual_material_date,
         net_weight_text = EXCLUDED.net_weight_text,
         package_count_text = EXCLUDED.package_count_text,
         container_volume_text = EXCLUDED.container_volume_text,
         pallet_info = EXCLUDED.pallet_info,
         accessory_status = EXCLUDED.accessory_status,
         packaging_spec = EXCLUDED.packaging_spec`,
      [
        id,
        expected_material_date || null,
        actual_material_date || null,
        net_weight_text || null,
        package_count_text || null,
        container_volume_text || null,
        pallet_info || null,
        accessory_status || null,
        packaging_spec || null,
      ]
    );

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
             VALUES ($1, 'UPDATE_WAREHOUSE', 'Order', $2, $3)`,
      [req.user.id, id, { expected_material_date, actual_material_date, net_weight_text, package_count_text, container_volume_text, pallet_info, accessory_status, packaging_spec }]
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

export const getOrderSummaryReport = async (req, res) => {
  try {
    const { id } = req.params;

    const orderRes = await pool.query("SELECT id, po_auto_code, status, name FROM orders WHERE id = $1 AND deleted_at IS NULL", [id]);
    if (orderRes.rowCount === 0) return res.status(404).json({ message: "Order not found" });
    const isDone = orderRes.rows[0].status === "DONE";

    const query = isDone ? `
      WITH product_stages AS (
          SELECT
              ss.product_id,
              ss.start_pgo_id,
              ss.final_pgo_id,
              ss.final_op_name
          FROM order_product_snapshots ss
          WHERE ss.order_id = $1
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
              'operation_name', snap_op->>'operation_name',
              'actual_quantity', COALESCE((SELECT SUM(dti.actual_quantity) FROM daily_production_ticket_items dti JOIN daily_production_tickets dt ON dt.id = dti.ticket_id WHERE dti.order_id = $1 AND dti.product_id = p.id AND dti.product_group_operation_id = (snap_op->>'pgo_id')::int AND dt.deleted_at IS NULL AND dt.status IN ('APPROVED', 'COMPLETED')), 0)
            ) ORDER BY (snap_op->>'sequence_order')::int ASC)
            FROM jsonb_array_elements(ss.operations_json) AS snap_op
          ) as operations_detail
      FROM order_products op
      JOIN products p ON op.product_id = p.id
      JOIN product_stages ps ON p.id = ps.product_id
      JOIN order_product_snapshots ss ON ss.order_id = op.order_id AND ss.product_id = op.product_id
      LEFT JOIN plating_totals pt ON p.id = pt.product_id
      LEFT JOIN plating_returns pr ON p.id = pr.product_id
      LEFT JOIN packaging_totals pkt ON p.id = pkt.product_id
      WHERE op.order_id = $1
    ` : `
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
              'actual_quantity', COALESCE(op_totals.qty, 0),
              'inventory_input', COALESCE((
                SELECT MAX(pp_inv.inventory_input)
                FROM production_plans pp_inv
                WHERE pp_inv.order_id = $1
                  AND pp_inv.product_id = p.id
                  AND pp_inv.product_group_operation_id = pgo.id
                  AND pp_inv.deleted_at IS NULL
              ), 0)
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
