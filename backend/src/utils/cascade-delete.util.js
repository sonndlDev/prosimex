/**
 * Removes or soft-deletes dependent rows when master (source) data is soft-deleted.
 * Uses the same client within an open transaction when provided.
 */

async function softDeleteProductionPlansByFilter(client, whereSql, params, userId) {
  const plansRes = await client.query(
    `SELECT id, order_id FROM production_plans WHERE deleted_at IS NULL AND (${whereSql})`,
    params,
  );
  if (plansRes.rowCount === 0) return;

  const planIds = plansRes.rows.map((r) => r.id);
  await client.query(
    `DELETE FROM machine_schedules WHERE production_plan_id = ANY($1::int[])`,
    [planIds],
  );
  await client.query(
    `UPDATE production_plans
     SET deleted_at = CURRENT_TIMESTAMP,
         modified_by = $1,
         modified_time = CURRENT_TIMESTAMP
     WHERE id = ANY($2::int[]) AND deleted_at IS NULL`,
    [userId, planIds],
  );

  const orderIds = [...new Set(plansRes.rows.map((r) => r.order_id).filter(Boolean))];
  for (const orderId of orderIds) {
    const remaining = await client.query(
      `SELECT id FROM production_plans WHERE order_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [orderId],
    );
    if (remaining.rowCount === 0) {
      await client.query(`UPDATE orders SET status = 'NOT_STARTED' WHERE id = $1 AND deleted_at IS NULL`, [
        orderId,
      ]);
    }
  }
}

/** Sync legacy orders.product_id and total quantity after order_products change */
async function syncOrdersAfterProductRemoval(client, productId) {
  await client.query(
    `UPDATE orders o
     SET product_id = sub.first_product_id,
         quantity = COALESCE(sub.total_qty, 0),
         updated_at = CURRENT_TIMESTAMP
     FROM (
       SELECT op.order_id,
              (SELECT op2.product_id FROM order_products op2 WHERE op2.order_id = op.order_id ORDER BY op2.product_id LIMIT 1) AS first_product_id,
              SUM(op.quantity) AS total_qty
       FROM order_products op
       GROUP BY op.order_id
     ) sub
     WHERE o.id = sub.order_id AND o.deleted_at IS NULL`,
  );
  await client.query(
    `UPDATE orders
     SET product_id = NULL, quantity = 0, updated_at = CURRENT_TIMESTAMP
     WHERE product_id = $1
       AND deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM order_products op WHERE op.order_id = orders.id)`,
    [productId],
  );
}

export async function cascadeOnProductDelete(client, productId, userId) {
  await client.query(`DELETE FROM order_products WHERE product_id = $1`, [productId]);
  await syncOrdersAfterProductRemoval(client, productId);

  await softDeleteProductionPlansByFilter(client, "product_id = $1", [productId], userId);

  await client.query(`DELETE FROM daily_production_ticket_items WHERE product_id = $1`, [productId]);
  await client.query(`DELETE FROM outsourcing_ticket_items WHERE product_id = $1`, [productId]);

  await client.query(
    `UPDATE product_inventory SET deleted_at = CURRENT_TIMESTAMP
     WHERE product_id = $1 AND deleted_at IS NULL`,
    [productId],
  );
}

export async function cascadeOnCustomerDelete(client, customerId) {
  await client.query(
    `UPDATE orders
     SET customer_id = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE customer_id = $1 AND deleted_at IS NULL`,
    [customerId],
  );
}

export async function cascadeOnMachineDelete(client, machineId, userId) {
  await softDeleteProductionPlansByFilter(client, "machine_id = $1", [machineId], userId);

  await client.query(
    `DELETE FROM machine_schedules WHERE machine_id = $1`,
    [machineId],
  );

  await client.query(
    `UPDATE product_group_operations
     SET deleted_at = CURRENT_TIMESTAMP
     WHERE machine_id = $1 AND deleted_at IS NULL`,
    [machineId],
  );

  await client.query(
    `UPDATE daily_production_tickets SET deleted_at = CURRENT_TIMESTAMP
     WHERE machine_id = $1 AND deleted_at IS NULL`,
    [machineId],
  );
}

export async function cascadeOnOperationDelete(client, operationId, userId) {
  await client.query(
    `UPDATE product_group_operations
     SET deleted_at = CURRENT_TIMESTAMP
     WHERE operation_id = $1 AND deleted_at IS NULL`,
    [operationId],
  );

  await client.query(
    `UPDATE product_inventory SET deleted_at = CURRENT_TIMESTAMP
     WHERE operation_id = $1 AND deleted_at IS NULL`,
    [operationId],
  );
}

export async function cascadeOnProductGroupDelete(client, productGroupId, userId) {
  const productsRes = await client.query(
    `SELECT id FROM products WHERE product_group_id = $1 AND deleted_at IS NULL`,
    [productGroupId],
  );

  await client.query(
    `UPDATE product_group_operations
     SET deleted_at = CURRENT_TIMESTAMP
     WHERE product_group_id = $1 AND deleted_at IS NULL`,
    [productGroupId],
  );

  for (const { id: productId } of productsRes.rows) {
    await cascadeOnProductDelete(client, productId, userId);
    await client.query(
      `UPDATE products SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP
       WHERE id = $1 AND deleted_at IS NULL`,
      [productId, userId],
    );
  }
}

export async function cascadeOnFactoryDelete(client, factoryId, userId) {
  const machinesRes = await client.query(
    `SELECT id FROM machines WHERE factory_id = $1 AND deleted_at IS NULL`,
    [factoryId],
  );
  for (const { id } of machinesRes.rows) {
    await cascadeOnMachineDelete(client, id, userId);
    await client.query(
      `UPDATE machines SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, userId],
    );
  }

  const groupsRes = await client.query(
    `SELECT id FROM product_groups WHERE factory_id = $1 AND deleted_at IS NULL`,
    [factoryId],
  );
  for (const { id } of groupsRes.rows) {
    await cascadeOnProductGroupDelete(client, id, userId);
    await client.query(
      `UPDATE product_groups SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, userId],
    );
  }

  const productsRes = await client.query(
    `SELECT id FROM products WHERE factory_id = $1 AND deleted_at IS NULL`,
    [factoryId],
  );
  for (const { id } of productsRes.rows) {
    await cascadeOnProductDelete(client, id, userId);
    await client.query(
      `UPDATE products SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1`,
      [id, userId],
    );
  }

  const ordersRes = await client.query(
    `SELECT id FROM orders WHERE factory_id = $1 AND deleted_at IS NULL`,
    [factoryId],
  );
  for (const { id: orderId } of ordersRes.rows) {
    await client.query(
      `UPDATE orders SET deleted_at = CURRENT_TIMESTAMP, modified_by = $2, modified_time = CURRENT_TIMESTAMP WHERE id = $1`,
      [orderId, userId],
    );
    await client.query(`DELETE FROM order_products WHERE order_id = $1`, [orderId]);
    await softDeleteProductionPlansByFilter(client, "order_id = $1", [orderId], userId);
  }
}

export async function cascadeOnWorkerDelete(client, workerId) {
  await client.query(`DELETE FROM worker_plan_assignments WHERE worker_id = $1`, [workerId]);
}
