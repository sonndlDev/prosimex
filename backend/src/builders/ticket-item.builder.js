/**
 * Gắn dữ liệu từ các entity map vào một daily ticket item.
 */
export function buildTicketItemResponse(item, {
  orderMap,
  customerMap,
  productMap,
  pgoMap,
  planIdMap,
  planComboMap,
}) {
  const order    = orderMap[item.order_id]                          || {};
  const customer = customerMap[order.customer_id]                  || {};
  const product  = productMap[item.product_id]                     || {};
  const pgo      = pgoMap[item.product_group_operation_id]         || {};

  // Ưu tiên production_plan_id trực tiếp, fallback về combo lookup
  const planKey = `${item.order_id}_${item.product_id}_${item.product_group_operation_id}`;
  const plan = (item.production_plan_id ? planIdMap[item.production_plan_id] : null)
    ?? planComboMap[planKey]
    ?? {};

  return {
    ...item,
    order_code:         order.order_code          ?? null,
    order_name:         order.name                ?? null,
    po_customer:        order.po_customer         ?? null,
    customer_code:      customer.code             ?? null,
    customer_name:      customer.name             ?? null,
    product_name:       product.name              ?? null,
    product_group_name: product.product_group_name ?? null,
    pgo_operation_name: pgo.operation_name        ?? null,
    operation_note:     pgo.operation_note        ?? null,
    pgo_machine_name:   pgo.machine_name          ?? null,
    remaining_quantity: plan.remaining_quantity   ?? null,
    dinh_muc:           plan.dinh_muc ?? pgo.dinh_muc ?? null,
  };
}
