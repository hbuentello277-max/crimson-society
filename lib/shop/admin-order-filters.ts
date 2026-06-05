export type AdminOrderFilter =
  | "all"
  | "pending"
  | "paid"
  | "unfulfilled"
  | "fulfilled"
  | "shipped"
  | "cancelled"
  | "pickup_pending"
  | "pickup_ready";

type OrderFilterRow = {
  status: string;
  fulfillment_status: string;
  delivery_method: string;
  pickup_status: string;
};

export function orderMatchesAdminFilter(
  order: OrderFilterRow,
  filter: AdminOrderFilter,
): boolean {
  switch (filter) {
    case "pending":
      return order.status === "pending";
    case "paid":
      return order.status === "paid";
    case "unfulfilled":
      return order.status === "paid" && order.fulfillment_status === "unfulfilled";
    case "fulfilled":
      return order.fulfillment_status === "fulfilled";
    case "shipped":
      return order.fulfillment_status === "shipped";
    case "cancelled":
      return order.status === "cancelled" || order.fulfillment_status === "cancelled";
    case "pickup_pending":
      return order.delivery_method === "local_pickup" && order.pickup_status === "pending";
    case "pickup_ready":
      return order.delivery_method === "local_pickup" && order.pickup_status === "ready";
    case "all":
    default:
      return true;
  }
}
