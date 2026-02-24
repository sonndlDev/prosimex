import pool from '../../config/db.js'

export const getProductionPlans = async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT pp.*, o.order_code, pgo.sequence_order, op.name as operation_name, m.name as machine_name
            FROM production_plans pp
            JOIN orders o ON pp.order_id = o.id
            JOIN product_group_operations pgo ON pp.product_group_operation_id = pgo.id
            JOIN operations op ON pgo.operation_id = op.id
            JOIN machines m ON pgo.machine_id = m.id
            WHERE pp.deleted_at IS NULL
            ORDER BY pp.created_at DESC
        `)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving production plans', error })
  }
}

export const createProductionPlan = async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const {
      order_id,
      product_group_operation_id,
      inventory_input,
      planned_start_date,
      days // [{date, hours, is_overtime}]
    } = req.body

    const created_by = req.user.id

    // 1. Fetch related Order and Operation info
    const orderRes = await client.query('SELECT quantity FROM orders WHERE id = $1', [order_id])
    if (orderRes.rowCount === 0) throw new Error('Order not found')
    const order_quantity = parseFloat(orderRes.rows[0].quantity)

    const pgoRes = await client.query('SELECT machine_id, dinh_muc FROM product_group_operations WHERE id = $1', [product_group_operation_id])
    if (pgoRes.rowCount === 0) throw new Error('Product Group Operation not found')
    const pgo = pgoRes.rows[0]
    const machine_id = pgo.machine_id

    // 2. Business Logic Calculations
    const remaining_quantity = order_quantity - parseFloat(inventory_input)
    const total_required_work = parseFloat(days.reduce((acc, d) => acc + parseFloat(d.hours), 0))
    const planned_end_date = days[days.length - 1].date

    // 3. Insert Production Plan
    const planInsert = await client.query(
      `INSERT INTO production_plans 
             (order_id, product_group_operation_id, inventory_input, remaining_quantity, total_required_work, planned_start_date, planned_end_date, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [order_id, product_group_operation_id, inventory_input, remaining_quantity, total_required_work, planned_start_date, planned_end_date, created_by]
    )
    const newPlan = planInsert.rows[0]

    // 4. Insert Production Plan Days
    for (const day of days) {
      await client.query(
        `INSERT INTO production_plan_days (production_plan_id, working_date, planned_work_quantity, is_overtime)
                 VALUES ($1, $2, $3, $4)`,
        [newPlan.id, day.date, day.hours, day.is_overtime]
      )
    }

    // 5. Insert Machine Schedule Block (Summary block for the timeline)
    await client.query(
      `INSERT INTO machine_schedules (machine_id, order_id, production_plan_id, start_date, end_date)
             VALUES ($1, $2, $3, $4, $5)`,
      [machine_id, order_id, newPlan.id, planned_start_date, planned_end_date]
    )

    // 6. Update Order Status
    await client.query('UPDATE orders SET status = $1 WHERE id = $2', ['PLANNED', order_id])

    // 7. Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
             VALUES ($1, 'CREATE', 'ProductionPlan', $2, $3)`,
      [created_by, newPlan.id, newPlan]
    )

    await client.query('COMMIT')
    res.status(201).json({ plan: newPlan })

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Create Plan Error:', error)
    res.status(500).json({ message: error.message || 'Error creating production plan' })
  } finally {
    client.release()
  }
}
