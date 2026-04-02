import pool from "../../config/db.js";

export const getOrders = async (req, res) => {
  try {
    const { factory_id, page = 1, limit = 10, search = "" } = req.query;
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
      whereClause += ` AND (o.name ILIKE $${queryParams.length} OR o.order_code ILIKE $${queryParams.length} OR c.name ILIKE $${queryParams.length})`;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Get data
    const dataQuery = `
      SELECT o.*, c.name as customer_name, 
             COALESCE(cu.full_name, cu.username) as creator_name, COALESCE(mu.full_name, mu.username) as modifier_name,
             oe.production_start_date, oe.expected_shipping_date, oe.expected_container_shipping_date, oe.customer_confirmation_result,
             oe.expected_material_date, oe.actual_material_date, oe.net_weight_text, oe.package_count_text, oe.container_volume_text,
             COALESCE(
               (SELECT json_agg(json_build_object('id', p.id, 'name', p.name, 'product_group_id', p.product_group_id, 'quantity', op.quantity))
                FROM order_products op
                JOIN products p ON op.product_id = p.id
                WHERE op.order_id = o.id),
               '[]'
             ) as products
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      LEFT JOIN users cu ON o.created_by = cu.id
      LEFT JOIN users mu ON o.modified_by = mu.id
      LEFT JOIN order_ext oe ON o.id = oe.order_id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;

    const result = await pool.query(dataQuery, [...queryParams, limitInt, offsetInt]);
    
    res.json({
      data: result.rows,
      total,
      page: pageInt,
      limit: limitInt
    });
  } catch (error) {
    console.error("Get Orders Error:", error);
    res.status(500).json({ message: "Error retrieving orders", error });
  }
};

export const getOrderCompletionReport = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        p.id as product_id,
        p.name as product_code,
        op.quantity as required_quantity,
        (
          SELECT COALESCE(SUM(dti.actual_quantity), 0)
          FROM daily_production_ticket_items dti 
          JOIN daily_production_tickets dt ON dti.ticket_id = dt.id 
          WHERE dti.order_id = $1 AND dti.product_id = p.id AND dt.status = 'COMPLETED' AND dt.deleted_at IS NULL
        ) as sx_quantity,
        (
          SELECT COALESCE(SUM(ot.quantity_out), 0)
          FROM outsourcing_tickets ot 
          WHERE ot.order_id = $1 AND ot.product_id = p.id AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
        ) as plating_out_quantity,
        (
          SELECT COALESCE(SUM(or_t.quantity_returned), 0)
          FROM outsourcing_returns or_t 
          JOIN outsourcing_tickets ot ON or_t.ticket_id = ot.id 
          WHERE ot.order_id = $1 AND ot.product_id = p.id AND ot.type = 'PLATING' AND ot.deleted_at IS NULL
        ) as plating_returned_quantity,
        (
          SELECT COALESCE(SUM(ot.quantity_out), 0)
          FROM outsourcing_tickets ot 
          WHERE ot.order_id = $1 AND ot.product_id = p.id AND ot.type = 'PACKAGING' AND ot.deleted_at IS NULL
        ) as packaging_out_quantity
      FROM order_products op
      JOIN products p ON op.product_id = p.id
      WHERE op.order_id = $1
    `;

    const result = await pool.query(query, [id]);

    const data = result.rows.map(row => {
      const required = parseFloat(row.required_quantity) || 0;
      const sx = parseFloat(row.sx_quantity) || 0;
      const platingOut = parseFloat(row.plating_out_quantity) || 0;
      const platingReturned = parseFloat(row.plating_returned_quantity) || 0;
      const packagingOut = parseFloat(row.packaging_out_quantity) || 0;

      // Formula = SX + ĐI XMS + ĐÓNG GÓI
      const sum = sx + platingOut + packagingOut;
      let percentage = 0;
      if (required > 0) {
        percentage = (sum / required) * 100;
      }

      return {
        ...row,
        sx_quantity: sx,
        plating_out_quantity: platingOut,
        plating_returned_quantity: platingReturned,
        packaging_out_quantity: packagingOut,
        completion_percentage: percentage
      };
    });

    res.json({ data });
  } catch (error) {
    console.error("Get Order Completion Report Error:", error);
    res.status(500).json({ message: "Error retrieving order completion report", error });
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
      received_date,
      delivery_date,
      quantity,
      production_location,
      person_in_charge,
      note,
      factory_id,
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

    // 2. Insert Order Products with quantity
    for (const item of items) {
      await client.query(
        "INSERT INTO order_products (order_id, product_id, quantity) VALUES ($1, $2, $3)",
        [orderId, item.product_id, parseFloat(item.quantity) || 0],
      );
    }

    // Business rule: After insert, po_auto_code = PO_{order.id}_{po_customer}
    const po_auto_code = `PO_${orderId}_${po_customer}`;

    const updateRes = await client.query(
      "UPDATE orders SET po_auto_code = $1 WHERE id = $2 RETURNING *",
      [po_auto_code, orderId],
    );

    const newOrder = updateRes.rows[0];

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
      production_start_date,
      expected_shipping_date,
      expected_container_shipping_date,
      customer_confirmation_result,
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

    // Re-calculate po_auto_code if po_customer changes
    let po_auto_code = beforeData.po_auto_code;
    if (po_customer && po_customer !== beforeData.po_customer) {
      po_auto_code = `PO_${id}_${po_customer}`;
    }

    // Sync Products - support both product_items (new) and product_ids (legacy)
    let totalQuantity = quantity;
    if (product_items && Array.isArray(product_items)) {
      await client.query("DELETE FROM order_products WHERE order_id = $1", [
        id,
      ]);
      for (const item of product_items) {
        await client.query(
          "INSERT INTO order_products (order_id, product_id, quantity) VALUES ($1, $2, $3)",
          [id, item.product_id, parseFloat(item.quantity) || 0],
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
        await client.query(
          "INSERT INTO order_products (order_id, product_id) VALUES ($1, $2)",
          [id, pId],
        );
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
                 modified_time = CURRENT_TIMESTAMP
             WHERE id = $11 AND deleted_at IS NULL RETURNING *`,
      [
        name,
        po_customer,
        po_auto_code,
        received_date,
        delivery_date || null,
        totalQuantity || quantity,
        production_location,
        person_in_charge,
        note,
        status,
        id,
        req.user.id
      ],
    );

    const afterData = result.rows[0];

    // Update order_ext
    await client.query(
      `INSERT INTO order_ext (order_id, production_start_date, expected_shipping_date, expected_container_shipping_date, customer_confirmation_result)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (order_id) DO UPDATE SET
         production_start_date = EXCLUDED.production_start_date,
         expected_shipping_date = EXCLUDED.expected_shipping_date,
         expected_container_shipping_date = EXCLUDED.expected_container_shipping_date,
         customer_confirmation_result = EXCLUDED.customer_confirmation_result`,
      [
        id,
        production_start_date || null,
        expected_shipping_date || null,
        expected_container_shipping_date || null,
        customer_confirmation_result || null,
      ]
    );

    afterData.production_start_date = production_start_date || null;
    afterData.expected_shipping_date = expected_shipping_date || null;
    afterData.expected_container_shipping_date = expected_container_shipping_date || null;
    afterData.customer_confirmation_result = customer_confirmation_result || null;

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
