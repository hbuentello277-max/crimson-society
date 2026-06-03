import type { NotificationType } from "@/lib/notifications";

const TYPE_STYLES: Record<
  NotificationType,
  { bg: string; label: string; glyph: string }
> = {
  profile_followed: { bg: "bg-sky-500/90", label: "Followers", glyph: "👤" },
  meet_joined: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_left: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_chat_message: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_chat_photo: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_removed: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_canceled: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  meet_ended: { bg: "bg-fuchsia-500/85", label: "Activity", glyph: "♥" },
  direct_message: { bg: "bg-[#b4141e]/20 border border-[#b4141e]", label: "Messages", glyph: "✉" },
  account_deletion_requested: { bg: "bg-amber-600/85", label: "Admin", glyph: "!" },
  account_deletion_canceled: { bg: "bg-zinc-600/85", label: "Admin", glyph: "↩" },
  account_deletion_approved: { bg: "bg-emerald-700/85", label: "Admin", glyph: "✓" },
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
