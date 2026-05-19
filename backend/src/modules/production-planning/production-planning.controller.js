import pool from "../../config/db.js";

export const getProductionPlans = async (req, res) => {
  try {
    const { page = 1, limit = 10, order_ids, product_ids, machine_ids } = req.query;
    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 10;
    const offsetInt = (pageInt - 1) * limitInt;

    let whereClause = "WHERE pp.deleted_at IS NULL";
    const queryParams = [];

    // Normalize order_ids to array
    const orderIdsArray = order_ids
      ? Array.isArray(order_ids)
        ? order_ids
        : order_ids.split(",")
      : [];

    if (orderIdsArray.length > 0) {
      queryParams.push(orderIdsArray);
      whereClause += ` AND pp.order_id = ANY($${queryParams.length})`;
    }

    // Normalize product_ids to array
    const productIdsArray = product_ids
      ? Array.isArray(product_ids)
        ? product_ids
        : product_ids.split(",")
      : [];

    if (productIdsArray.length > 0) {
      queryParams.push(productIdsArray);
      whereClause += ` AND pp.product_id = ANY($${queryParams.length})`;
    } else if (req.query.product_id) {
      queryParams.push(req.query.product_id);
      whereClause += ` AND pp.product_id = $${queryParams.length}`;
    }

    // Normalize machine_ids to array
    const machineIdsArray = machine_ids
      ? Array.isArray(machine_ids)
        ? machine_ids
        : machine_ids.split(",")
      : [];

    if (machineIdsArray.length > 0) {
      queryParams.push(machineIdsArray);
      whereClause += ` AND pp.machine_id = ANY($${queryParams.length})`;
    } else if (req.query.machine_id) {
      queryParams.push(req.query.machine_id);
      whereClause += ` AND pp.machine_id = $${queryParams.length}`;
    }
    // Removed date-based filtering as per user request to be less restrictive
    // Previously used to limit by order range or plan date range

    // Get total count for pagination
    const countResult = await pool.query(
      `
      SELECT COUNT(*) 
      FROM production_plans pp
      JOIN orders o ON pp.order_id = o.id
      ${whereClause}
    `,
      queryParams,
    );

    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    const result = await pool.query(
      `
            SELECT 
                pp.*, 
                o.order_code, 
                o.name as order_name,
                o.po_customer,
                COALESCE(op_qty.quantity, o.quantity, 0) as quantity,
                COALESCE(op_qty.quantity, o.quantity, 0) as product_quantity,
                p.name as product_name,
                pg.name as product_group_name,
                pgo.sequence_order, 
                COALESCE(pp.dinh_muc, pgo.dinh_muc) as dinh_muc,
                op.name as operation_name, 
                pp.machine_id as machine_id,
                m.name as machine_name,
                m.code as machine_code,
                f.name as factory_name,
                COALESCE(cu.full_name, cu.username) as creator_name,
                COALESCE(mu.full_name, mu.username) as modifier_name
            FROM production_plans pp
            LEFT JOIN orders o ON pp.order_id = o.id
            LEFT JOIN products p ON pp.product_id = p.id
            LEFT JOIN product_groups pg ON p.product_group_id = pg.id
            LEFT JOIN product_group_operations pgo ON pp.product_group_operation_id = pgo.id
            LEFT JOIN operations op ON pgo.operation_id = op.id
            LEFT JOIN machines m ON pp.machine_id = m.id
            LEFT JOIN factories f ON pp.factory_id = f.id
            LEFT JOIN order_products op_qty ON op_qty.order_id = pp.order_id AND op_qty.product_id = pp.product_id
            LEFT JOIN users cu ON pp.created_by = cu.id
            LEFT JOIN users mu ON pp.modified_by = mu.id
            ${whereClause}
            ORDER BY p.name ASC, pgo.sequence_order ASC, pp.created_at DESC
            LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
        `,
      [...queryParams, limitInt, offsetInt],
    );

    // Fix N+1: Fetch tất cả days của tất cả plans trong 1 query duy nhất
    let plansWithDays = result.rows.map(plan => ({ ...plan, days: [] }));

    if (result.rows.length > 0) {
      const planIds = result.rows.map(r => r.id);
      const allDaysRes = await pool.query(
        `SELECT 
              ppd.production_plan_id,
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
           WHERE ppd.production_plan_id = ANY($1)
           ORDER BY ppd.working_date ASC`,
        [planIds],
      );

      // Group days theo plan_id bằng JS (không cần thêm query)
      const daysMap = {};
      for (const day of allDaysRes.rows) {
        if (!daysMap[day.production_plan_id]) daysMap[day.production_plan_id] = [];
        daysMap[day.production_plan_id].push(day);
      }

      plansWithDays = result.rows.map(plan => ({
        ...plan,
        days: daysMap[plan.id] || [],
      }));
    }

    res.json({
      data: plansWithDays,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get Plans Error:", error);
    res
      .status(500)
      .json({ message: "Error retrieving production plans", error });
  }
};

export const createProductionPlan = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const {
      order_id,
      product_id,
      product_group_operation_id,
      factory_id,
      is_outsourced,
      inventory_input,
      planned_start_date,
      dinh_muc,
      machine_id: provided_machine_id,
      days, // [{date, hours, is_overtime}]
    } = req.body;

    const created_by = req.user.id;

    // 1. Fetch related Order and product-specific quantity
    // Try to get product-specific quantity from order_products first
    let order_quantity;
    if (product_id) {
      const opRes = await client.query(
        "SELECT quantity FROM order_products WHERE order_id = $1 AND product_id = $2",
        [order_id, product_id],
      );
      if (opRes.rowCount > 0 && parseFloat(opRes.rows[0].quantity) > 0) {
        order_quantity = parseFloat(opRes.rows[0].quantity);
      }
    }
    if (!order_quantity) {
      const orderRes = await client.query(
        "SELECT quantity FROM orders WHERE id = $1",
        [order_id],
      );
      if (orderRes.rowCount === 0) throw new Error("Order not found");
      order_quantity = parseFloat(orderRes.rows[0].quantity);
    }

    let machine_id = provided_machine_id;
    let final_dinh_muc = dinh_muc;

    if (product_group_operation_id) {
      const pgoRes = await client.query(
        "SELECT machine_id, dinh_muc FROM product_group_operations WHERE id = $1",
        [product_group_operation_id],
      );
      if (pgoRes.rowCount > 0) {
        const pgo = pgoRes.rows[0];
        if (!final_dinh_muc) final_dinh_muc = pgo.dinh_muc;
      }
    }

    // 2. Business Logic Calculations
    const remaining_quantity = order_quantity - parseFloat(inventory_input);
    const total_required_work = parseFloat(
      days.reduce((acc, d) => acc + parseFloat(d.hours), 0),
    );
    // Fallback: nếu days rỗng hoặc chỉ có 0h placeholder → dùng planned_start_date
    const nonZeroDays = (days || []).filter(d => parseFloat(d.hours) > 0);
    const planned_end_date = nonZeroDays.length > 0
      ? nonZeroDays[nonZeroDays.length - 1].date
      : planned_start_date;

    // 3. Insert Production Plan
    const planInsert = await client.query(
      `INSERT INTO production_plans 
             (order_id, product_id, product_group_operation_id, inventory_input, remaining_quantity, total_required_work, planned_start_date, planned_end_date, factory_id, is_outsourced, dinh_muc, machine_id, created_by, modified_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13) RETURNING *`,
      [
        order_id,
        product_id || null,
        product_group_operation_id || null,
        inventory_input,
        remaining_quantity,
        total_required_work,
        planned_start_date,
        planned_end_date,
        factory_id || null,
        is_outsourced || false,
        final_dinh_muc || null,
        machine_id || null,
        created_by,
      ],
    );
    const newPlan = planInsert.rows[0];

    // 4. Insert Production Plan Days (Bulk INSERT — 1 query thay vì N queries)
    if (days && days.length > 0) {
      const dayValues = days
        .map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`)
        .join(", ");
      const dayParams = [
        newPlan.id,
        ...days.flatMap(d => [d.date, d.hours, d.is_overtime]),
      ];
      await client.query(
        `INSERT INTO production_plan_days (production_plan_id, working_date, planned_work_quantity, is_overtime) VALUES ${dayValues}`,
        dayParams,
      );
    }

    // 5. Insert Machine Schedule Block (Summary block for the timeline)
    if (machine_id) {
      await client.query(
        `INSERT INTO machine_schedules (machine_id, order_id, production_plan_id, start_date, end_date)
               VALUES ($1, $2, $3, $4, $5)`,
        [machine_id, order_id, newPlan.id, planned_start_date, planned_end_date],
      );
    }

    // 6. Update Order Status
    await client.query("UPDATE orders SET status = $1 WHERE id = $2", [
      "PLANNED",
      order_id,
    ]);

    // 7. Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
             VALUES ($1, 'CREATE', 'ProductionPlan', $2, $3)`,
      [created_by, newPlan.id, newPlan],
    );

    await client.query("COMMIT");
    res.status(201).json({ plan: newPlan });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create Plan Error:", error);
    res
      .status(500)
      .json({ message: error.message || "Error creating production plan" });
  } finally {
    client.release();
  }
};

export const updateProductionPlan = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const {
      inventory_input,
      product_id,
      planned_start_date,
      dinh_muc,
      machine_id,
      days, // [{date, hours, is_overtime}]
    } = req.body;

    const created_by = req.user.id;

    // 1. Fetch current plan
    const currentPlanRes = await client.query(
      "SELECT * FROM production_plans WHERE id = $1",
      [id],
    );
    if (currentPlanRes.rowCount === 0) throw new Error("Plan not found");
    const currentPlan = currentPlanRes.rows[0];

    // 2. Fetch order info — prioritize product-specific quantity from order_products
    let order_quantity;
    const currentProductId = product_id || currentPlan.product_id;
    if (currentProductId) {
      const opRes = await client.query(
        "SELECT quantity FROM order_products WHERE order_id = $1 AND product_id = $2",
        [currentPlan.order_id, currentProductId],
      );
      if (opRes.rowCount > 0 && parseFloat(opRes.rows[0].quantity) > 0) {
        order_quantity = parseFloat(opRes.rows[0].quantity);
      }
    }
    if (!order_quantity) {
      const orderRes = await client.query(
        "SELECT quantity FROM orders WHERE id = $1",
        [currentPlan.order_id],
      );
      if (orderRes.rowCount === 0) throw new Error("Order not found");
      order_quantity = parseFloat(orderRes.rows[0].quantity);
    }

    // 3. Logic
    const remaining_quantity = order_quantity - parseFloat(inventory_input);
    const total_required_work = parseFloat(
      days.reduce((acc, d) => acc + parseFloat(d.hours), 0),
    );
    const planned_end_date = days[days.length - 1].date;

    // 4. Update Plan
    const result = await client.query(
      `UPDATE production_plans 
       SET inventory_input = $1, remaining_quantity = $2, total_required_work = $3, 
           planned_start_date = $4, planned_end_date = $5, product_id = $6, 
           dinh_muc = $7, machine_id = $10, updated_at = CURRENT_TIMESTAMP,
           modified_by = $9, modified_time = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [
        inventory_input !== undefined
          ? inventory_input
          : currentPlan.inventory_input,
        remaining_quantity,
        total_required_work,
        planned_start_date || currentPlan.planned_start_date,
        planned_end_date,
        product_id || currentPlan.product_id,
        dinh_muc || currentPlan.dinh_muc,
        id,
        created_by,
        machine_id !== undefined ? machine_id : currentPlan.machine_id,
      ],
    );

    // 5. Delete and Re-insert Days (Bulk INSERT)
    await client.query(
      "DELETE FROM production_plan_days WHERE production_plan_id = $1",
      [id],
    );
    if (days && days.length > 0) {
      const dayValues = days
        .map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`)
        .join(", ");
      const dayParams = [
        id,
        ...days.flatMap(d => [d.date, d.hours, d.is_overtime]),
      ];
      await client.query(
        `INSERT INTO production_plan_days (production_plan_id, working_date, planned_work_quantity, is_overtime) VALUES ${dayValues}`,
        dayParams,
      );
    }

    // 6. Update Machine Schedule (Delete and Re-insert to ensure consistency)
    await client.query("DELETE FROM machine_schedules WHERE production_plan_id = $1", [id]);
    if (machine_id) {
      await client.query(
        `INSERT INTO machine_schedules (machine_id, order_id, production_plan_id, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5)`,
        [machine_id, currentPlan.order_id, id, planned_start_date || currentPlan.planned_start_date, planned_end_date],
      );
    }

    // 7. Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, before_data, after_data)
             VALUES ($1, 'UPDATE', 'ProductionPlan', $2, $3, $4)`,
      [created_by, id, currentPlan, result.rows[0]],
    );

    await client.query("COMMIT");
    res.json({ plan: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Update Plan Error:", error);
    res
      .status(500)
      .json({ message: error.message || "Error updating production plan" });
  } finally {
    client.release();
  }
};

export const deleteProductionPlan = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const created_by = req.user.id;

    // 1. Fetch current plan to check existence and get order_id
    const planRes = await client.query(
      "SELECT order_id FROM production_plans WHERE id = $1 AND deleted_at IS NULL",
      [id],
    );
    if (planRes.rowCount === 0)
      throw new Error("Plan not found or already deleted");
    const { order_id } = planRes.rows[0];

    // 2. Delete from machine_schedules (CASCADE equivalent)
    await client.query(
      "DELETE FROM machine_schedules WHERE production_plan_id = $1",
      [id],
    );

    // 3. Soft delete the production plan
    await client.query(
      "UPDATE production_plans SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1",
      [id, created_by],
    );

    // 4. Reset order status if no more ACTIVE plans exist for this order
    const remainingPlansRes = await client.query(
      "SELECT id FROM production_plans WHERE order_id = $1 AND id != $2 AND deleted_at IS NULL",
      [order_id, id],
    );
    if (remainingPlansRes.rowCount === 0) {
      await client.query("UPDATE orders SET status = $1 WHERE id = $2", [
        "DRAFT",
        order_id,
      ]);
    }

    // 5. Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id)
             VALUES ($1, 'DELETE', 'ProductionPlan', $2)`,
      [created_by, id],
    );

    await client.query("COMMIT");
    res.json({ message: "Production plan deleted successfully" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Delete Plan Error:", error);
    res
      .status(500)
      .json({ message: error.message || "Error deleting production plan" });
  } finally {
    client.release();
  }
};

export const cloneProductionPlan = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const created_by = req.user.id;

    // 1. Fetch current plan
    const currentPlanRes = await client.query(
      "SELECT * FROM production_plans WHERE id = $1 AND deleted_at IS NULL",
      [id],
    );
    if (currentPlanRes.rowCount === 0) throw new Error("Plan not found");
    const plan = currentPlanRes.rows[0];

    // 2. Insert as new Plan
    const planInsert = await client.query(
      `INSERT INTO production_plans 
             (order_id, product_id, product_group_operation_id, inventory_input, remaining_quantity, total_required_work, planned_start_date, planned_end_date, factory_id, is_outsourced, dinh_muc, created_by, modified_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12) RETURNING *`,
      [
        plan.order_id,
        plan.product_id,
        plan.product_group_operation_id,
        plan.inventory_input,
        plan.remaining_quantity,
        plan.total_required_work,
        plan.planned_start_date,
        plan.planned_end_date,
        plan.factory_id,
        plan.is_outsourced,
        plan.dinh_muc,
        created_by,
      ],
    );
    const newPlan = planInsert.rows[0];

    // 3. Clone Days (Bulk INSERT)
    const daysRes = await client.query(
      "SELECT * FROM production_plan_days WHERE production_plan_id = $1",
      [id],
    );
    if (daysRes.rows.length > 0) {
      const dayValues = daysRes.rows
        .map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4})`)
        .join(", ");
      const dayParams = [
        newPlan.id,
        ...daysRes.rows.flatMap(d => [d.working_date, d.planned_work_quantity, d.is_overtime]),
      ];
      await client.query(
        `INSERT INTO production_plan_days (production_plan_id, working_date, planned_work_quantity, is_overtime) VALUES ${dayValues}`,
        dayParams,
      );
    }

    // 4. Clone Machine Schedule
    const schedRes = await client.query(
      "SELECT * FROM machine_schedules WHERE production_plan_id = $1",
      [id],
    );
    if (schedRes.rowCount > 0) {
      const ms = schedRes.rows[0];
      await client.query(
        `INSERT INTO machine_schedules (machine_id, order_id, production_plan_id, start_date, end_date)
               VALUES ($1, $2, $3, $4, $5)`,
        [ms.machine_id, ms.order_id, newPlan.id, ms.start_date, ms.end_date],
      );
    }

    // 5. Audit Log
    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
             VALUES ($1, 'CLONE', 'ProductionPlan', $2, $3)`,
      [created_by, newPlan.id, newPlan],
    );

    await client.query("COMMIT");
    res.status(201).json({ plan: newPlan });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Clone Plan Error:", error);
    res
      .status(500)
      .json({ message: error.message || "Error cloning production plan" });
  } finally {
    client.release();
  }
};

export const createOrderGeneralPlan = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { 
      order_id, 
      start_date, 
      end_date, 
      factory_id,
      is_outsourced,
      items // [{productId, quantity, norm, startDate, endDate}]
    } = req.body;
    const created_by = req.user.id;

    // 1. Get order details
    const orderRes = await client.query("SELECT * FROM orders WHERE id = $1", [order_id]);
    if (orderRes.rowCount === 0) throw new Error("Order not found");

    let productsToPlan = [];
    if (items && items.length > 0) {
      productsToPlan = items;
    } else {
      const productsRes = await client.query(
        `SELECT op.*, p.name 
         FROM order_products op 
         JOIN products p ON op.product_id = p.id 
         WHERE op.order_id = $1`,
        [order_id]
      );
      const products = productsRes.rows;
      if (products.length === 0) throw new Error("No products in order");

      const totalOrderQty = products.reduce((sum, p) => sum + parseFloat(p.quantity), 0);
      const start = new Date(start_date);
      const end = new Date(end_date);
      const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays <= 0) throw new Error("Invalid date range");

      const avgOrderNormPerDay = totalOrderQty / diffDays;
      const avgItemNormPerDay = avgOrderNormPerDay; // User requested: take the norm directly, no division by count

      let sequentialStart = new Date(start);
      productsToPlan = products.map(p => {
        const pQty = parseFloat(p.quantity);
        const pDaysNeeded = Math.ceil(pQty / avgItemNormPerDay);
        const pStart = new Date(sequentialStart);
        // Skip sundays during pStart to pEnd
        let workingDaysCount = 0;
        let iterDate = new Date(pStart);
        while(workingDaysCount < pDaysNeeded) {
           if (iterDate.getDay() !== 0) workingDaysCount++;
           if (workingDaysCount < pDaysNeeded) {
               iterDate.setDate(iterDate.getDate() + 1);
           }
        }
        const pEnd = iterDate;

        sequentialStart = new Date(pEnd);
        sequentialStart.setDate(sequentialStart.getDate() + 1);

        return {
          productId: p.product_id,
          quantity: pQty,
          norm: avgItemNormPerDay,
          startDate: pStart,
          endDate: pEnd
        };
      });
    }

    const createdPlans = [];
    for (const p of productsToPlan) {
      const pQty = parseFloat(p.quantity || 0);
      // Validate dates to avoid NaN results
      const pStart = new Date(p.startDate || p.working_date || start_date);
      const pEnd = new Date(p.endDate || p.working_date || end_date);
      
      if (isNaN(pStart.getTime()) || isNaN(pEnd.getTime())) {
        continue; // Skip invalid items
      }

      const pNorm = parseFloat(p.norm) || 1;
      const pDaysNeeded = Math.max(1, Math.ceil((pEnd - pStart) / (1000 * 60 * 60 * 24)) + 1);

      // Insert Plan
      const planInsert = await client.query(
        `INSERT INTO production_plans 
         (order_id, product_id, inventory_input, remaining_quantity, total_required_work, planned_start_date, planned_end_date, factory_id, is_outsourced, dinh_muc, machine_id, created_by, modified_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12) RETURNING *`,
        [
          order_id,
          p.productId || p.product_id,
          0,
          pQty,
          pDaysNeeded * 8,
          pStart,
          pEnd,
          factory_id || null,
          is_outsourced || false,
          pNorm,
          req.body.machine_id || null,
          created_by
        ]
      );
      const newPlan = planInsert.rows[0];

      // Insert Days — Standard 8h per day (Bulk INSERT)
      const generatedDays = [];
      let currentDate = new Date(pStart);
      while(generatedDays.length < pDaysNeeded && currentDate <= pEnd) {
         if (currentDate.getDay() !== 0) { // NO SUNDAY
            generatedDays.push(new Date(currentDate));
         } else {
            pEnd.setDate(pEnd.getDate() + 1);
         }
         currentDate.setDate(currentDate.getDate() + 1);
      }
      if (generatedDays.length > 0) {
        // Fix: Use separate parameters for each value instead of reusing $3 and $4 which might point to dates
        const dayValues = generatedDays
          .map((_, i) => `($1, $${i + 2}, 8, false)`)
          .join(", ");
        const dayParams = [newPlan.id, ...generatedDays];
        await client.query(
          `INSERT INTO production_plan_days (production_plan_id, working_date, planned_work_quantity, is_overtime) VALUES ${dayValues}`,
          dayParams,
        );
      }
      createdPlans.push(newPlan);
    }

    await client.query("UPDATE orders SET status = 'PLANNED' WHERE id = $1", [order_id]);
    await client.query(
        `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data) VALUES ($1, 'BATCH_CREATE', 'ProductionPlan', $2, $3)`,
        [created_by, order_id, { plan_count: createdPlans.length }]
    );
    await client.query("COMMIT");
    res.status(201).json({ success: true, count: createdPlans.length });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Create General Order Plan Error:", error);
    res.status(500).json({ message: error.message });
  } finally {
    client.release();
  }
};

export const stopPlan = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const { stopped_at } = req.body;
    const user_id = req.user.id;

    if (!stopped_at) {
      return res.status(400).json({ message: "stopped_at is required" });
    }

    // 1. Update plan status and stopped_at
    const planUpdate = await client.query(
      `UPDATE production_plans 
       SET status = 'STOPPED', 
           stopped_at = $1, 
           updated_at = CURRENT_TIMESTAMP, 
           modified_by = $2 
       WHERE id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [stopped_at, user_id, id]
    );

    if (planUpdate.rowCount === 0) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // 2. Remove from machine_schedules for days AFTER stopped_at
    // We keep the schedule up to stopped_at for historical accuracy
    await client.query(
      `DELETE FROM machine_schedules 
       WHERE production_plan_id = $1 
         AND end_date > $2`,
      [id, stopped_at]
    );

    // [Optional] Update or delete production_plan_days after stopped_at?
    // User said "dừng ở các ngày còn lại", so it makes sense to keep them in DB but mark them as inactive.
    // However, our UI handles graying out based on stopped_at, so keeping them is fine.

    await client.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, after_data)
       VALUES ($1, 'STOP', 'ProductionPlan', $2, $3)`,
      [user_id, id, JSON.stringify({ stopped_at })]
    );

    await client.query("COMMIT");
    res.json({ message: "Plan stopped successfully", data: planUpdate.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Stop Plan Error:", error);
    res.status(500).json({ message: "Error stopping plan", error });
  } finally {
    client.release();
  }
};

/**
 * GET /production-plans/planned-status?order_id=X
 * Trả về trạng thái kế hoạch cho từng product trong đơn hàng:
 * [{ product_id, product_group_id, total_ops, planned_ops, all_planned }]
 */
export const getPlannedStatusByOrder = async (req, res) => {
  try {
    const { order_id } = req.query;
    if (!order_id) return res.status(400).json({ message: 'order_id is required' });

    // Lấy tất cả products trong đơn hàng kèm product_group_id
    const productsRes = await pool.query(
      `SELECT op.product_id, p.product_group_id
       FROM order_products op
       JOIN products p ON p.id = op.product_id
       WHERE op.order_id = $1`,
      [order_id]
    );
    const products = productsRes.rows;
    if (products.length === 0) return res.json([]);

    // Lấy tổng số operations của mỗi product_group
    const groupIds = [...new Set(products.map(p => p.product_group_id).filter(Boolean))];
    let totalOpsMap = {};
    if (groupIds.length > 0) {
      const totalOpsRes = await pool.query(
        `SELECT product_group_id, COUNT(*) as total_ops
         FROM product_group_operations
         WHERE product_group_id = ANY($1) AND deleted_at IS NULL
         GROUP BY product_group_id`,
        [groupIds]
      );
      totalOpsRes.rows.forEach(r => { totalOpsMap[r.product_group_id] = parseInt(r.total_ops); });
    }

    // Lấy số operations đã có kế hoạch cho mỗi product trong đơn hàng này
    const plannedRes = await pool.query(
      `SELECT pp.product_id, COUNT(DISTINCT pp.product_group_operation_id) as planned_ops
       FROM production_plans pp
       WHERE pp.order_id = $1
         AND pp.product_group_operation_id IS NOT NULL
         AND pp.deleted_at IS NULL
       GROUP BY pp.product_id`,
      [order_id]
    );
    const plannedMap = {};
    plannedRes.rows.forEach(r => { plannedMap[r.product_id] = parseInt(r.planned_ops); });

    // Kết hợp kết quả
    const result = products.map(p => {
      const total = totalOpsMap[p.product_group_id] || 0;
      const planned = plannedMap[p.product_id] || 0;
      return {
        product_id: p.product_id,
        product_group_id: p.product_group_id,
        total_ops: total,
        planned_ops: planned,
        all_planned: total > 0 && planned >= total,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Get Planned Status Error:', error);
    res.status(500).json({ message: 'Error retrieving planned status', error });
  }
};
