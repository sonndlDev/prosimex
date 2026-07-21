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

/** Snapshot all product data (identity + group + stages + operations + customer) when order becomes DONE */
export async function snapshotOrderProducts(client, orderId) {
  await client.query(
    `INSERT INTO order_product_snapshots
       (order_id, product_id, product_name, product_group_id, product_group_name,
        has_xi_ma, has_dong_goi, stage_count, total_stages,
        final_pgo_id, start_pgo_id, final_op_name, operations_json,
        customer_name, snapshot_at)
     SELECT
       op.order_id,
       op.product_id,
       p.name AS product_name,
       p.product_group_id,
       pg.name AS product_group_name,
       COALESCE(psc.has_xi_ma, FALSE) AS has_xi_ma,
       COALESCE(psc.has_dong_goi, FALSE) AS has_dong_goi,
       CASE
         WHEN COALESCE(psc.has_xi_ma, FALSE) AND COALESCE(psc.has_dong_goi, FALSE) THEN 4
         WHEN COALESCE(psc.has_dong_goi, FALSE) THEN 2
         ELSE 0
       END AS stage_count,
       (SELECT COUNT(*) FROM product_group_operations pgo
        WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id)
        AND pgo.deleted_at IS NULL) AS total_stages,
       (SELECT pgo.id FROM product_group_operations pgo
        WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id)
        AND pgo.deleted_at IS NULL
        ORDER BY pgo.sequence_order DESC LIMIT 1) AS final_pgo_id,
       (SELECT pgo.id FROM product_group_operations pgo
        WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id)
        AND pgo.deleted_at IS NULL
        ORDER BY pgo.sequence_order ASC LIMIT 1) AS start_pgo_id,
       (SELECT o.name FROM product_group_operations pgo
        JOIN operations o ON pgo.operation_id = o.id
        WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id)
        AND pgo.deleted_at IS NULL
        ORDER BY pgo.sequence_order DESC LIMIT 1) AS final_op_name,
       COALESCE(
         (SELECT json_agg(json_build_object(
           'pgo_id', pgo.id,
           'operation_id', pgo.operation_id,
           'operation_name', o.name,
           'sequence_order', pgo.sequence_order,
           'dinh_muc', pgo.dinh_muc
         ) ORDER BY pgo.sequence_order ASC)
           FROM product_group_operations pgo
           JOIN operations o ON pgo.operation_id = o.id
           WHERE pgo.product_group_id = COALESCE(op.product_group_id, p.product_group_id)
           AND pgo.deleted_at IS NULL),
         '[]'::jsonb
       ) AS operations_json,
       cust.name AS customer_name,
       NOW() AS snapshot_at
     FROM order_products op
     JOIN products p ON op.product_id = p.id AND p.deleted_at IS NULL
     LEFT JOIN product_groups pg ON pg.id = p.product_group_id AND pg.deleted_at IS NULL
     LEFT JOIN product_stage_configs psc ON psc.product_id = op.product_id
       AND psc.product_group_id = COALESCE(op.product_group_id, p.product_group_id)
     LEFT JOIN orders ord ON ord.id = op.order_id
     LEFT JOIN customers cust ON cust.id = ord.customer_id AND cust.deleted_at IS NULL
     WHERE op.order_id = $1
     ON CONFLICT (order_id, product_id) DO UPDATE SET
       product_name = EXCLUDED.product_name,
       product_group_id = EXCLUDED.product_group_id,
       product_group_name = EXCLUDED.product_group_name,
       has_xi_ma = EXCLUDED.has_xi_ma,
       has_dong_goi = EXCLUDED.has_dong_goi,
       stage_count = EXCLUDED.stage_count,
       total_stages = EXCLUDED.total_stages,
       final_pgo_id = EXCLUDED.final_pgo_id,
       start_pgo_id = EXCLUDED.start_pgo_id,
       final_op_name = EXCLUDED.final_op_name,
       operations_json = EXCLUDED.operations_json,
       customer_name = EXCLUDED.customer_name,
       snapshot_at = NOW()`,
    [orderId],
  );
}
