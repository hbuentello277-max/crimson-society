export type OrderTimelineStep = {
  key: string;
  label: string;
  at: string | null;
  complete: boolean;
  current: boolean;
};

type ShippingTimelineInput = {
  fulfillment_status: string;
  created_at: string;
  fulfilled_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
};

type PickupTimelineInput = {
  pickup_status: string;
  created_at: string;
  pickup_ready_at?: string | null;
  picked_up_at?: string | null;
};

function step(
  key: string,
  label: string,
  at: string | null,
  complete: boolean,
  current: boolean,
): OrderTimelineStep {
  return { key, label, at, complete, current };
}

export function buildShippingOrderTimeline(order: ShippingTimelineInput): OrderTimelineStep[] {
  const status = order.fulfillment_status;
  const isDelivered = status === "delivered";
  const isShipped = status === "shipped" || isDelivered;
  const isPreparing = status === "fulfilled" || isShipped;

  return [
    step("received", "Order received", order.created_at, true, status === "unfulfilled"),
    step(
      "preparing",
      "Preparing",
      order.fulfilled_at ?? null,
      isPreparing,
      status === "fulfilled",
    ),
    step("shipped", "Shipped", order.shipped_at ?? null, isShipped, status === "shipped"),
    step(
      "delivered",
      "Delivered",
      order.delivered_at ?? null,
      isDelivered,
      isDelivered,
    ),
  ];
}

export function buildPickupOrderTimeline(order: PickupTimelineInput): OrderTimelineStep[] {
  const status = order.pickup_status;
  const isReady = status === "ready" || status === "picked_up";
  const isComplete = status === "picked_up";

  return [
    step("received", "Order received", order.created_at, true, status === "pending"),
    step(
      "ready",
      "Ready for pickup",
      order.pickup_ready_at ?? null,
      isReady,
      status === "ready",
    ),
    step(
      "completed",
      "Completed",
      order.picked_up_at ?? null,
      isComplete,
      isComplete,
    ),
  ];
}
