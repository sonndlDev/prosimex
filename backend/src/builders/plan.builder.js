import { userDisplayName } from '../dal/users.dal.js';

/**
 * Gắn dữ liệu từ các entity map vào một production plan.
 * Giữ nguyên logic COALESCE giống SQL cũ nhưng thực hiện trong JS.
 */
export function buildPlanResponse(plan, {
  orderMap,
  productMap,
  pgoMap,
  machineMap,
  factoryMap,
  userMap,
  orderProductMap,
  daysMap,
}) {
  const order     = orderMap[plan.order_id]                        || {};
  const product   = productMap[plan.product_id]                    || {};
  const pgo       = pgoMap[plan.product_group_operation_id]        || {};
  const machine   = machineMap[plan.machine_id]                    || {};
  const factory   = factoryMap[plan.factory_id]                    || {};
  const creator   = userMap[plan.created_by]                       || {};
  const modifier  = userMap[plan.modified_by]                      || {};
  const opProduct = orderProductMap[`${plan.order_id}_${plan.product_id}`] || {};

  const quantity = parseFloat(opProduct.quantity ?? order.quantity ?? 0);

  return {
    ...plan,
    // Order
    order_code:         order.order_code      ?? null,
    order_name:         order.name            ?? null,
    po_customer:        order.po_customer     ?? null,
    // Quantity (product-specific first, then order-level)
    quantity,
    product_quantity:   quantity,
    // Product (order_products name takes priority)
    product_name:       opProduct.product_name       || product.name              || null,
    product_group_name: opProduct.product_group_name || product.product_group_name || null,
    // PGO
    sequence_order:  pgo.sequence_order ?? null,
    dinh_muc:        plan.dinh_muc     ?? pgo.dinh_muc ?? null,
    operation_name:  pgo.operation_name ?? null,
    operation_note:  pgo.operation_note ?? null,
    // Machine
    machine_id:   plan.machine_id   ?? null,
    machine_name: machine.name      ?? null,
    machine_code: machine.code      ?? null,
    // Factory / Users
    factory_name:  factory.name                              ?? null,
    creator_name:  userDisplayName(creator)                 ?? null,
    modifier_name: userDisplayName(modifier)                ?? null,
    // Days
    days: daysMap[plan.id] ?? [],
  };
}
