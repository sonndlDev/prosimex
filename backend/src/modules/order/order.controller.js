import pool from '../../config/db.js'

export const getOrders = async (req, res) => {
  try {
    const { factory_id } = req.query
    let query = `
            SELECT o.*, c.name as customer_name, p.name as product_name, p.product_group_id, u.username as created_by_username
            FROM orders o
            JOIN customers c ON o.customer_id = c.id
            JOIN products p ON o.product_id = p.id
            JOIN users u ON o.created_by = u.id
            WHERE o.deleted_at IS NULL
        `
    const params = []
    if (factory_id) {
      query += ' AND o.factory_id = $1'
      params.push(factory_id)
    }
    query += ' ORDER BY o.created_at DESC'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving orders', error })
  }
}

export const createOrder = async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const {
      order_code, name, customer_id, product_id, po_customer,
      received_date, delivery_date, quantity, production_location,
      person_in_charge, note, factory_id
    } = req.body

    const created_by = req.user.id // From JWT Auth Middleware

    // 1. Insert Order
    const insertRes = await client.query(
      `INSERT INTO orders 
            (order_code, name, customer_id, product_id, po_customer, 
             received_date, delivery_date, quantity, production_location, 
             person_in_charge, note, factory_id, created_by) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
      [order_code, name, customer_id, product_id, po_customer,
        received_date, delivery_date, quantity, production_location,
        person_in_charge, note, factory_id, created_by]
    )

    const orderId = insertRes.rows[0].id

    // Business rule: After insert, po_auto_code = PO_{order.id}_{po_customer}
    const po_auto_code = `PO_${orderId}_${po_customer}`

    const updateRes = await client.query(
      'UPDATE orders SET po_auto_code = $1 WHERE id = $2 RETURNING *',
      [po_auto_code, orderId]
    )

    const newOrder = updateRes.rows[0]

    // Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
             VALUES ($1, 'CREATE', 'Order', $2, $3)`,
      [created_by, orderId, newOrder]
    )

    await client.query('COMMIT')
    res.status(201).json(newOrder)
  } catch (error) {
    await client.query('ROLLBACK')
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Order code must be unique' })
    }
    console.error('Create Order Error:', error)
    res.status(500).json({ message: 'Error creating order' })
  } finally {
    client.release()
  }
}

export const updateOrder = async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const {
      name, po_customer, received_date, delivery_date, quantity,
      production_location, person_in_charge, note, status
    } = req.body

    // Get Before Data for Audit Log
    const currentOrderRes = await client.query('SELECT * FROM orders WHERE id = $1 AND deleted_at IS NULL', [id])
    if (currentOrderRes.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Order not found' })
    }
    const beforeData = currentOrderRes.rows[0]

    // Re-calculate po_auto_code if po_customer changes
    let po_auto_code = beforeData.po_auto_code
    if (po_customer && po_customer !== beforeData.po_customer) {
      po_auto_code = `PO_${id}_${po_customer}`
    }

    const result = await client.query(
      `UPDATE orders 
             SET name = COALESCE($1, name), 
                 po_customer = COALESCE($2, po_customer),
                 po_auto_code = $3,
                 received_date = COALESCE($4, received_date),
                 delivery_date = COALESCE($5, delivery_date),
                 quantity = COALESCE($6, quantity),
                 production_location = COALESCE($7, production_location),
                 person_in_charge = COALESCE($8, person_in_charge),
                 note = COALESCE($9, note),
                 status = COALESCE($10, status),
                 updated_at = CURRENT_TIMESTAMP 
             WHERE id = $11 AND deleted_at IS NULL RETURNING *`,
      [name, po_customer, po_auto_code, received_date, delivery_date, quantity, production_location, person_in_charge, note, status, id]
    )

    const afterData = result.rows[0]

    // Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
             VALUES ($1, 'UPDATE', 'Order', $2, $3, $4)`,
      [req.user.id, id, beforeData, afterData]
    )

    await client.query('COMMIT')
    res.json(afterData)
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Update Order Error:', error)
    res.status(500).json({ message: 'Error updating order' })
  } finally {
    client.release()
  }
}

export const deleteOrder = async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params

    const currentOrderRes = await client.query('SELECT * FROM orders WHERE id = $1 AND deleted_at IS NULL', [id])
    if (currentOrderRes.rowCount === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Order not found' })
    }
    const beforeData = currentOrderRes.rows[0]

    await client.query(
      'UPDATE orders SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    )

    // Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data)
             VALUES ($1, 'DELETE', 'Order', $2, $3)`,
      [req.user.id, id, beforeData]
    )

    await client.query('COMMIT')
    res.json({ message: 'Order deleted successfully' })
  } catch (error) {
    await client.query('ROLLBACK')
    res.status(500).json({ message: 'Error deleting order', error })
  } finally {
    client.release()
  }
}
