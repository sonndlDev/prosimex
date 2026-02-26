import pool from '../../config/db.js'

export const getProductionPlans = async (req, res) => {
  try {
    const { page = 1, limit = 10, order_ids } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE pp.deleted_at IS NULL';
    const queryParams = [];
    
    // Normalize order_ids to array
    const orderIdsArray = order_ids ? (Array.isArray(order_ids) ? order_ids : order_ids.split(',')) : [];
    
    if (orderIdsArray.length > 0) {
      queryParams.push(orderIdsArray);
      whereClause += ` AND pp.order_id = ANY($${queryParams.length})`;
    }

    // Get total count for pagination
    const countResult = await pool.query(`
      SELECT COUNT(*) 
      FROM production_plans pp
      JOIN orders o ON pp.order_id = o.id
      ${whereClause}
    `, queryParams);
    
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const result = await pool.query(`
            SELECT 
                pp.*, 
                o.order_code, 
                o.po_customer,
                o.quantity,
                p.name as product_name,
                pg.name as product_group_name,
                pgo.sequence_order, 
                pgo.dinh_muc,
                op.name as operation_name, 
                m.name as machine_name
            FROM production_plans pp
            JOIN orders o ON pp.order_id = o.id
            JOIN products p ON pp.product_id = p.id
            JOIN product_groups pg ON p.product_group_id = pg.id
            JOIN product_group_operations pgo ON pp.product_group_operation_id = pgo.id
            JOIN operations op ON pgo.operation_id = op.id
            JOIN machines m ON pgo.machine_id = m.id
            ${whereClause}
            ORDER BY pp.created_at DESC
            LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
        `, [...queryParams, limit, offset])
    
    // Fetch days and worker counts for each plan
    const plansWithDays = await Promise.all(result.rows.map(async (plan) => {
        const daysRes = await pool.query(
            `SELECT 
                ppd.working_date, 
                ppd.planned_work_quantity, 
                ppd.is_overtime,
                (SELECT COUNT(*) FROM worker_plan_assignments wpa 
                 WHERE wpa.production_plan_id = ppd.production_plan_id 
                 AND wpa.working_date = ppd.working_date) as worker_count,
                (SELECT string_agg(w.name, ', ') FROM worker_plan_assignments wpa 
                 JOIN workers w ON wpa.worker_id = w.id
                 WHERE wpa.production_plan_id = ppd.production_plan_id 
                 AND wpa.working_date = ppd.working_date) as worker_names
             FROM production_plan_days ppd 
             WHERE ppd.production_plan_id = $1 
             ORDER BY ppd.working_date ASC`,
            [plan.id]
        );
        return {
            ...plan,
            days: daysRes.rows
        };
    }));

    res.json({
        data: plansWithDays,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Get Plans Error:', error);
    res.status(500).json({ message: 'Error retrieving production plans', error })
  }
}

export const createProductionPlan = async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const {
      order_id,
      product_id,
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
             (order_id, product_id, product_group_operation_id, inventory_input, remaining_quantity, total_required_work, planned_start_date, planned_end_date, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [order_id, product_id, product_group_operation_id, inventory_input, remaining_quantity, total_required_work, planned_start_date, planned_end_date, created_by]
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

export const updateProductionPlan = async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const {
      inventory_input,
      product_id,
      planned_start_date,
      days // [{date, hours, is_overtime}]
    } = req.body

    const created_by = req.user.id

    // 1. Fetch current plan
    const currentPlanRes = await client.query('SELECT * FROM production_plans WHERE id = $1', [id])
    if (currentPlanRes.rowCount === 0) throw new Error('Plan not found')
    const currentPlan = currentPlanRes.rows[0]

    // 2. Fetch order info
    const orderRes = await client.query('SELECT quantity FROM orders WHERE id = $1', [currentPlan.order_id])
    const order_quantity = parseFloat(orderRes.rows[0].quantity)

    // 3. Logic
    const remaining_quantity = order_quantity - parseFloat(inventory_input)
    const total_required_work = parseFloat(days.reduce((acc, d) => acc + parseFloat(d.hours), 0))
    const planned_end_date = days[days.length - 1].date

    // 4. Update Plan
    const result = await client.query(
      `UPDATE production_plans 
       SET inventory_input = $1, remaining_quantity = $2, total_required_work = $3, 
           planned_start_date = $4, planned_end_date = $5, product_id = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [
        inventory_input !== undefined ? inventory_input : currentPlan.inventory_input, 
        remaining_quantity, 
        total_required_work, 
        planned_start_date || currentPlan.planned_start_date, 
        planned_end_date, 
        product_id || currentPlan.product_id, 
        id
      ]
    )

    // 5. Delete and Re-insert Days
    await client.query('DELETE FROM production_plan_days WHERE production_plan_id = $1', [id])
    for (const day of days) {
      await client.query(
        `INSERT INTO production_plan_days (production_plan_id, working_date, planned_work_quantity, is_overtime)
         VALUES ($1, $2, $3, $4)`,
        [id, day.date, day.hours, day.is_overtime]
      )
    }

    // 6. Update Machine Schedule
    await client.query(
      `UPDATE machine_schedules 
       SET start_date = $1, end_date = $2 
       WHERE production_plan_id = $3`,
      [planned_start_date, planned_end_date, id]
    )

    // 7. Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
             VALUES ($1, 'UPDATE', 'ProductionPlan', $2, $3, $4)`,
      [created_by, id, currentPlan, result.rows[0]]
    )

    await client.query('COMMIT')
    res.json({ plan: result.rows[0] })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Update Plan Error:', error)
    res.status(500).json({ message: error.message || 'Error updating production plan' })
  } finally {
    client.release()
  }
}

export const deleteProductionPlan = async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const created_by = req.user.id

    // 1. Fetch current plan to check existence and get order_id
    const planRes = await client.query('SELECT order_id FROM production_plans WHERE id = $1 AND deleted_at IS NULL', [id])
    if (planRes.rowCount === 0) throw new Error('Plan not found or already deleted')
    const { order_id } = planRes.rows[0]

    // 2. Delete from machine_schedules (CASCADE equivalent)
    await client.query('DELETE FROM machine_schedules WHERE production_plan_id = $1', [id])

    // 3. Soft delete the production plan
    await client.query(
      'UPDATE production_plans SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    )

    // 4. Reset order status if no more ACTIVE plans exist for this order
    const remainingPlansRes = await client.query(
      'SELECT id FROM production_plans WHERE order_id = $1 AND id != $2 AND deleted_at IS NULL',
      [order_id, id]
    )
    if (remainingPlansRes.rowCount === 0) {
      await client.query('UPDATE orders SET status = $1 WHERE id = $2', ['DRAFT', order_id])
    }

    // 5. Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id)
             VALUES ($1, 'DELETE', 'ProductionPlan', $2)`,
      [created_by, id]
    )

    await client.query('COMMIT')
    res.json({ message: 'Production plan deleted successfully' })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Delete Plan Error:', error)
    res.status(500).json({ message: error.message || 'Error deleting production plan' })
  } finally {
    client.release()
  }
}
