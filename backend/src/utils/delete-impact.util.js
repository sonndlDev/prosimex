function buildImpact(entityType, entityName, items) {
  const active = items.filter((i) => i.count > 0);
  const total = active.reduce((sum, i) => sum + i.count, 0);
  const summary =
    active.length === 0
      ? "Không có dữ liệu liên quan."
      : active.map((i) => `${i.count} ${i.label}`).join(", ");

  return {
    entityType,
    entityName,
    total,
    items,
    summary,
    hasImpact: active.length > 0,
  };
}

function mergeImpacts(impacts, entityType, label) {
  const merged = {};
  for (const impact of impacts) {
    for (const item of impact.items) {
      merged[item.key] = merged[item.key] || { ...item, count: 0 };
      merged[item.key].count += item.count;
    }
  }
  const items = Object.values(merged);
  return buildImpact(entityType, label, items);
}

export async function getProductDeleteImpact(pool, id) {
  const productRes = await pool.query(
    "SELECT id, name FROM products WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
  if (productRes.rowCount === 0) return null;

  const [orders, plans, dailyItems, outsourcingItems, inventory] = await Promise.all([
    pool.query(
      `SELECT COUNT(DISTINCT op.order_id)::int AS count
       FROM order_products op
       JOIN orders o ON o.id = op.order_id AND o.deleted_at IS NULL
       WHERE op.product_id = $1`,
      [id],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM production_plans WHERE product_id = $1 AND deleted_at IS NULL`,
      [id],
    ),
    pool.query(`SELECT COUNT(*)::int AS count FROM daily_production_ticket_items WHERE product_id = $1`, [id]),
    pool.query(`SELECT COUNT(*)::int AS count FROM outsourcing_ticket_items WHERE product_id = $1`, [id]),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM product_inventory WHERE product_id = $1 AND deleted_at IS NULL`,
      [id],
    ),
  ]);

  return buildImpact("product", productRes.rows[0].name, [
    { key: "orders", label: "đơn hàng", count: orders.rows[0].count },
    { key: "production_plans", label: "kế hoạch sản xuất", count: plans.rows[0].count },
    { key: "daily_tickets", label: "dòng phiếu sản xuất", count: dailyItems.rows[0].count },
    { key: "outsourcing", label: "dòng phiếu gia công", count: outsourcingItems.rows[0].count },
    { key: "inventory", label: "bản ghi tồn kho", count: inventory.rows[0].count },
  ]);
}

export async function getCustomerDeleteImpact(pool, id) {
  const res = await pool.query(
    "SELECT id, name FROM customers WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
  if (res.rowCount === 0) return null;

  const orders = await pool.query(
    `SELECT COUNT(*)::int AS count FROM orders WHERE customer_id = $1 AND deleted_at IS NULL`,
    [id],
  );

  return buildImpact("customer", res.rows[0].name, [
    { key: "orders", label: "đơn hàng (sẽ bỏ liên kết khách hàng)", count: orders.rows[0].count },
  ]);
}

export async function getMachineDeleteImpact(pool, id) {
  const res = await pool.query(
    "SELECT id, name FROM machines WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
  if (res.rowCount === 0) return null;

  const [plans, schedules, pgo, tickets] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS count FROM production_plans WHERE machine_id = $1 AND deleted_at IS NULL`,
      [id],
    ),
    pool.query(`SELECT COUNT(*)::int AS count FROM machine_schedules WHERE machine_id = $1`, [id]),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM product_group_operations WHERE machine_id = $1 AND deleted_at IS NULL`,
      [id],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM daily_production_tickets WHERE machine_id = $1 AND deleted_at IS NULL`,
      [id],
    ),
  ]);

  return buildImpact("machine", res.rows[0].name, [
    { key: "production_plans", label: "kế hoạch sản xuất", count: plans.rows[0].count },
    { key: "schedules", label: "lịch máy", count: schedules.rows[0].count },
    { key: "operations", label: "mapping công đoạn", count: pgo.rows[0].count },
    { key: "daily_tickets", label: "phiếu sản xuất", count: tickets.rows[0].count },
  ]);
}

export async function getOperationDeleteImpact(pool, id) {
  const res = await pool.query(
    "SELECT id, name FROM operations WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
  if (res.rowCount === 0) return null;

  const [pgo, inventory] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS count FROM product_group_operations WHERE operation_id = $1 AND deleted_at IS NULL`,
      [id],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM product_inventory WHERE operation_id = $1 AND deleted_at IS NULL`,
      [id],
    ),
  ]);

  return buildImpact("operation", res.rows[0].name, [
    { key: "product_group_operations", label: "mapping quy trình", count: pgo.rows[0].count },
    { key: "inventory", label: "bản ghi tồn kho", count: inventory.rows[0].count },
  ]);
}

export async function getProductGroupDeleteImpact(pool, id) {
  const res = await pool.query(
    "SELECT id, name FROM product_groups WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
  if (res.rowCount === 0) return null;

  const [products, pgo] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS count FROM products WHERE product_group_id = $1 AND deleted_at IS NULL`,
      [id],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM product_group_operations WHERE product_group_id = $1 AND deleted_at IS NULL`,
      [id],
    ),
  ]);

  return buildImpact("product_group", res.rows[0].name, [
    { key: "products", label: "mã hàng (sẽ bị xóa theo)", count: products.rows[0].count },
    { key: "operations", label: "mapping công đoạn", count: pgo.rows[0].count },
  ]);
}

export async function getFactoryDeleteImpact(pool, id) {
  const res = await pool.query(
    "SELECT id, name FROM factories WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
  if (res.rowCount === 0) return null;

  const [machines, groups, products, orders] = await Promise.all([
    pool.query(
      `SELECT COUNT(*)::int AS count FROM machines WHERE factory_id = $1 AND deleted_at IS NULL`,
      [id],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM product_groups WHERE factory_id = $1 AND deleted_at IS NULL`,
      [id],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM products WHERE factory_id = $1 AND deleted_at IS NULL`,
      [id],
    ),
    pool.query(
      `SELECT COUNT(*)::int AS count FROM orders WHERE factory_id = $1 AND deleted_at IS NULL`,
      [id],
    ),
  ]);

  return buildImpact("factory", res.rows[0].name, [
    { key: "machines", label: "máy", count: machines.rows[0].count },
    { key: "product_groups", label: "nhóm hàng", count: groups.rows[0].count },
    { key: "products", label: "mã hàng", count: products.rows[0].count },
    { key: "orders", label: "đơn hàng", count: orders.rows[0].count },
  ]);
}

export async function getWorkerDeleteImpact(pool, id) {
  const res = await pool.query(
    "SELECT id, name FROM workers WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
  if (res.rowCount === 0) return null;

  const assignments = await pool.query(
    `SELECT COUNT(*)::int AS count FROM worker_plan_assignments WHERE worker_id = $1`,
    [id],
  );

  return buildImpact("worker", res.rows[0].name, [
    { key: "assignments", label: "phân công kế hoạch", count: assignments.rows[0].count },
  ]);
}

const IMPACT_GETTERS = {
  product: getProductDeleteImpact,
  customer: getCustomerDeleteImpact,
  machine: getMachineDeleteImpact,
  operation: getOperationDeleteImpact,
  product_group: getProductGroupDeleteImpact,
  factory: getFactoryDeleteImpact,
  worker: getWorkerDeleteImpact,
};

export const DELETE_IMPACT_ENTITY_TYPES = Object.keys(IMPACT_GETTERS);

export async function getDeleteImpact(pool, entityType, id) {
  const getter = IMPACT_GETTERS[entityType];
  if (!getter) return null;
  return getter(pool, id);
}

export async function getBulkDeleteImpact(pool, entityType, ids) {
  const impacts = [];
  for (const id of ids) {
    const impact = await getDeleteImpact(pool, entityType, id);
    if (impact) impacts.push(impact);
  }
  if (impacts.length === 0) return null;
  if (impacts.length === 1) return impacts[0];
  return mergeImpacts(impacts, entityType, `${impacts.length} mục đã chọn`);
}

/** Permission required to view delete impact (same as delete). */
export const DELETE_IMPACT_PERMISSIONS = {
  product: "products:delete",
  customer: "customers:delete",
  machine: "machines:delete",
  operation: "operations:delete",
  product_group: "product_groups:delete",
  factory: "factories:delete",
  worker: "workers:delete",
};
