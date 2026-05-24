/** SQL fragment: json object for one order line product (snapshot-first display) */
export const ORDER_PRODUCT_JSON_FIELDS = `
  'id', op.product_id,
  'name', COALESCE(op.product_name, p.name),
  'product_group_id', COALESCE(op.product_group_id, p.product_group_id),
  'product_group_name', COALESCE(op.product_group_name, pg_snap.name),
  'quantity', op.quantity,
  'snapshot_at', op.snapshot_at,
  'current_name', p.name,
  'current_product_group_id', p.product_group_id,
  'current_product_group_name', pg_live.name,
  'has_master_drift',
    (op.product_name IS NOT NULL AND p.name IS DISTINCT FROM op.product_name)
    OR (op.product_group_id IS NOT NULL AND p.product_group_id IS DISTINCT FROM op.product_group_id)
`;

export async function fetchProductSnapshot(client, productId) {
  const res = await client.query(
    `SELECT p.name AS product_name,
            p.product_group_id,
            pg.name AS product_group_name
     FROM products p
     LEFT JOIN product_groups pg ON pg.id = p.product_group_id AND pg.deleted_at IS NULL
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [productId],
  );
  if (res.rowCount === 0) {
    throw new Error(`Product ${productId} not found`);
  }
  return res.rows[0];
}

export async function insertOrderProductWithSnapshot(
  client,
  orderId,
  productId,
  quantity,
) {
  const snap = await fetchProductSnapshot(client, productId);
  await client.query(
    `INSERT INTO order_products
       (order_id, product_id, quantity, product_name, product_group_id, product_group_name, snapshot_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [
      orderId,
      productId,
      parseFloat(quantity) || 0,
      snap.product_name,
      snap.product_group_id,
      snap.product_group_name,
    ],
  );
}

/** Refresh snapshot from master (e.g. when order transitions to DONE) */
export async function refreshOrderProductSnapshots(client, orderId) {
  await client.query(
    `UPDATE order_products op
     SET product_name = p.name,
         product_group_id = p.product_group_id,
         product_group_name = pg.name,
         snapshot_at = NOW()
     FROM products p
     LEFT JOIN product_groups pg ON pg.id = p.product_group_id AND pg.deleted_at IS NULL
     WHERE op.order_id = $1
       AND op.product_id = p.id
       AND p.deleted_at IS NULL`,
    [orderId],
  );
}
