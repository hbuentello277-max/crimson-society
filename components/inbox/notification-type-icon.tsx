import type { NotificationType } from "@/lib/notifications";

const TYPE_STYLES: Record<
  NotificationType,
  { bg: string; label: string; glyph: string }
> = {
  profile_followed: { bg: "bg-sky-500/90", label: "Followers", glyph: "👤" },
  follow: { bg: "bg-sky-500/90", label: "Followers", glyph: "👤" },
  meet_joined: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_left: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_chat_message: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_chat_photo: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_removed: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_canceled: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_cancelled: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_updated: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_ended: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_reminder: { bg: "bg-sky-500/85", label: "Reminder", glyph: "⏰" },
  direct_message: { bg: "bg-[#b4141e]/20 border border-[#b4141e]", label: "Messages", glyph: "✉" },
  connection_request: { bg: "bg-emerald-500/85", label: "Connect", glyph: "🤝" },
  connection_request_received: { bg: "bg-emerald-500/85", label: "Connect", glyph: "🤝" },
  connection_accepted: { bg: "bg-emerald-500/85", label: "Connect", glyph: "✓" },
  post_liked: { bg: "bg-rose-500/85", label: "Posts", glyph: "♥" },
  post_like: { bg: "bg-rose-500/85", label: "Posts", glyph: "♥" },
  post_commented: { bg: "bg-violet-500/85", label: "Posts", glyph: "💬" },
  post_comment: { bg: "bg-violet-500/85", label: "Posts", glyph: "💬" },
  admin_report_submitted: { bg: "bg-amber-500/90", label: "Moderation", glyph: "⚠" },
  account_deletion_requested: { bg: "bg-amber-500/90", label: "Admin", glyph: "⚠" },
  account_deletion_canceled: { bg: "bg-amber-500/90", label: "Admin", glyph: "↩" },
  account_deletion_approved: { bg: "bg-emerald-500/85", label: "Admin", glyph: "✓" },
  host_meet_created: { bg: "bg-[#b4141e]/70 border border-[#b4141e]", label: "Meets", glyph: "🔔" },
  crimson_credits_reward: { bg: "bg-[#b4141e]/70 border border-[#b4141e]", label: "Credits", glyph: "✦" },
  shop_order_paid: { bg: "bg-[#b4141e]/80 border border-[#b4141e]", label: "Shop", glyph: "🛍" },
  admin_order_created: { bg: "bg-[#b4141e]/80 border border-[#b4141e]", label: "Shop", glyph: "🛍" },
  admin_order_paid: { bg: "bg-[#b4141e]/80 border border-[#b4141e]", label: "Shop", glyph: "💳" },
  admin_low_inventory: { bg: "bg-amber-500/90", label: "Inventory", glyph: "⚠" },
  shop_order_confirmed: { bg: "bg-[#b4141e]/50 border border-[#b4141e]", label: "Shop", glyph: "✓" },
  shop_order_ready_for_pickup: { bg: "bg-sky-500/80", label: "Pickup", glyph: "📦" },
  shop_order_shipped: { bg: "bg-violet-500/80", label: "Shipped", glyph: "🚚" },
  order_created: { bg: "bg-[#b4141e]/50 border border-[#b4141e]", label: "Orders", glyph: "🛍" },
  order_confirmed: { bg: "bg-[#b4141e]/50 border border-[#b4141e]", label: "Orders", glyph: "✓" },
  order_preparing: { bg: "bg-amber-500/80", label: "Orders", glyph: "📦" },
  order_ready_to_ship: { bg: "bg-amber-500/80", label: "Orders", glyph: "📦" },
  order_shipped: { bg: "bg-violet-500/80", label: "Shipped", glyph: "🚚" },
  order_ready_for_pickup: { bg: "bg-sky-500/80", label: "Pickup", glyph: "📦" },
  order_delivered: { bg: "bg-emerald-500/80", label: "Delivered", glyph: "✓" },
  order_completed: { bg: "bg-emerald-500/80", label: "Complete", glyph: "✓" },
  favorite_rider_meet: { bg: "bg-zinc-600/80", label: "Legacy", glyph: "★" },
  favorite_rider_post: { bg: "bg-zinc-600/80", label: "Legacy", glyph: "★" },
  favorite_rider_ride_started: { bg: "bg-zinc-600/80", label: "Legacy", glyph: "★" },
  sos_activated: { bg: "bg-[#b4141e]/90 border border-[#f1c3c7]/40", label: "Rider SOS", glyph: "!" },
  sos_responded: { bg: "bg-[#b4141e]/80 border border-[#b4141e]", label: "Rider SOS", glyph: "↗" },
  sos_arrived: { bg: "bg-emerald-500/85", label: "Rider SOS", glyph: "✓" },
  sos_chat_message: { bg: "bg-[#b4141e]/80 border border-[#b4141e]", label: "SOS Chat", glyph: "✉" },
};

export function NotificationTypeIcon({ type }: { type: NotificationType }) {
  const style = TYPE_STYLES[type] ?? { bg: "bg-amber-500/90", label: "Update", glyph: "★" };

  return (
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg text-white ${style.bg}`}
      aria-hidden
    >
      {style.glyph}
    </div>
  );
}
