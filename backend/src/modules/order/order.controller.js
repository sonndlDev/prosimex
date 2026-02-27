import pool from "../../config/db.js";

export const getOrders = async (req, res) => {
  try {
    const { factory_id } = req.query;
    let query = `
            SELECT o.*, c.name as customer_name, u.username as created_by_username,
                   COALESCE(
                     (SELECT json_agg(json_build_object('id', p.id, 'name', p.name, 'product_group_id', p.product_group_id, 'quantity', op.quantity))
                      FROM order_products op
                      JOIN products p ON op.product_id = p.id
                      WHERE op.order_id = o.id),
                     '[]'
                   ) as products
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN users u ON o.created_by = u.id
            WHERE o.deleted_at IS NULL
        `;
    const params = [];
    if (factory_id) {
      query += " AND o.factory_id = $1";
      params.push(factory_id);
    }
    query += " ORDER BY o.created_at DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Get Orders Error:", error);
    res.status(500).json({ message: "Error retrieving orders", error });
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
             person_in_charge, note, factory_id, created_by) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
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
                 updated_at = CURRENT_TIMESTAMP 
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
      ],
    );

    const afterData = result.rows[0];

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
