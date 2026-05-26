import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  Timer,
  XCircle,
} from "lucide-react";

export const PRODUCT_ITEMS_GRID =
  "grid grid-cols-[36px_minmax(0,1fr)_minmax(0,1.5fr)_110px_36px] gap-3 items-center";

export const orderFormDefaultValues = {
  order_code: "",
  po_auto_code: "",
  name: "",
  customer_id: "",
  product_items: [],
  po_customer: "",
  received_date: DateTime.now().toFormat("yyyy-MM-dd"),
  production_location: "",
  person_in_charge: "",
  note: "",
  status: "DRAFT",
  production_start_date: "",
  expected_shipping_date: [],
  expected_container_shipping_date: [],
  customer_confirmation_result: "",
  pallet_info: "",
  accessory_status: "",
  expected_material_date: "",
  actual_material_date: "",
};

export function orderToFormValues(order) {
  if (!order) return orderFormDefaultValues;
  return {
    order_code: order.order_code,
    po_auto_code: order.po_auto_code || "",
    name: order.name,
    customer_id: String(order.customer_id),
    product_items:
      order.products?.map((p) => ({
        product_group_id: String(p.product_group_id || ""),
        product_id: String(p.id),
        quantity: p.quantity || "",
        snapshot_product_name: p.name || "",
        snapshot_product_group_name: p.product_group_name || "",
      })) || [],
    po_customer: order.po_customer,
    received_date: DateTime.fromISO(order.received_date).toFormat("yyyy-MM-dd"),
    production_location: order.production_location || "",
    person_in_charge: order.person_in_charge || "",
    note: order.note || "",
    status: order.status,
    production_start_date: order.production_start_date
      ? DateTime.fromISO(order.production_start_date).toFormat("yyyy-MM-dd")
      : "",
    expected_shipping_date: Array.isArray(order.expected_shipping_date)
      ? order.expected_shipping_date.map((d) =>
          DateTime.fromISO(d).toFormat("yyyy-MM-dd"),
        )
      : order.expected_shipping_date
        ? [DateTime.fromISO(order.expected_shipping_date).toFormat("yyyy-MM-dd")]
        : [],
    expected_container_shipping_date: Array.isArray(
      order.expected_container_shipping_date,
    )
      ? order.expected_container_shipping_date.map((d) =>
          DateTime.fromISO(d).toFormat("yyyy-MM-dd"),
        )
      : order.expected_container_shipping_date
        ? [
            DateTime.fromISO(order.expected_container_shipping_date).toFormat(
              "yyyy-MM-dd",
            ),
          ]
        : [],
    customer_confirmation_result: order.customer_confirmation_result || "",
    pallet_info: order.pallet_info || "",
    accessory_status: order.accessory_status || "",
    expected_material_date: order.expected_material_date
      ? DateTime.fromISO(order.expected_material_date).toFormat("yyyy-MM-dd")
      : "",
    actual_material_date: order.actual_material_date
      ? DateTime.fromISO(order.actual_material_date).toFormat("yyyy-MM-dd")
      : "",
  };
}

export function getOrderStatusBadge(status) {
  switch (status) {
    case "PLANNED":
      return (
        <Badge variant="primary" className="gap-1">
          <Timer className="w-3 h-3" /> PLANNED
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="w-3 h-3" /> IN PROGRESS
        </Badge>
      );
    case "DONE":
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="w-3 h-3" /> DONE
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="w-3 h-3" /> CANCELLED
        </Badge>
      );
    default:
      return <Badge variant="outline">DRAFT</Badge>;
  }
}
