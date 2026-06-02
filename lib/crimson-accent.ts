/**
 * Connect page "ALL" filter pill — single source of truth for Crimson Society accents.
 * Active: border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82]
 * Inactive: border-white/10 text-zinc-500 hover:border-white/30 hover:text-zinc-300
 */

/** Base pill / segmented control chip */
export const CS_PILL_BASE =
  "rounded-full border transition uppercase tracking-[0.22em]";

export const CS_PILL_SM = `${CS_PILL_BASE} px-3.5 py-1.5 text-[11px]`;
export const CS_PILL_MD = `${CS_PILL_BASE} px-4 py-2 text-[10px]`;

export const CS_PILL_ACTIVE = "border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82]";
export const CS_PILL_INACTIVE =
  "border-white/10 text-zinc-500 hover:border-white/30 hover:text-zinc-300";

/** Primary CTA (New Message, Join Meet, Post, Send when enabled, etc.) */
export const CS_CTA_PRIMARY =
  "rounded-full border border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82] transition hover:bg-[#b4141e]/30 disabled:cursor-not-allowed disabled:opacity-50";

export const CS_CTA_PRIMARY_SM = `${CS_CTA_PRIMARY} px-4 py-2 text-[10px] uppercase tracking-[0.22em]`;
export const CS_CTA_PRIMARY_MD = `${CS_CTA_PRIMARY} px-5 py-2.5 text-xs uppercase tracking-[0.22em]`;
export const CS_CTA_PRIMARY_LG = `${CS_CTA_PRIMARY} px-5 py-3.5 text-sm uppercase tracking-[0.3em]`;

/** Icon-only circular actions (send arrow, etc.) */
export const CS_ICON_BTN_ACTIVE =
  "flex items-center justify-center rounded-full border border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82] transition hover:bg-[#b4141e]/30";

export const CS_ICON_BTN_DISABLED =
  "flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-600";

/** Unread / count badges */
export const CS_BADGE =
  "inline-flex items-center justify-center rounded-full border border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82] font-semibold leading-none";

export const CS_BADGE_SM = `${CS_BADGE} min-w-[18px] h-[18px] px-1 text-[10px]`;
export const CS_BADGE_NAV = `${CS_BADGE} min-w-4 h-4 px-1 text-[9px] border-[#120608]`;

/** Tab row inside a bordered container (Inbox Messages/Notifications) */
export const CS_TAB_ACTIVE = CS_PILL_ACTIVE;
export const CS_TAB_INACTIVE =
  "text-zinc-500 hover:text-zinc-300";

/** Accent text / links */
export const CS_TEXT_ACCENT = "text-[#e87a82]";
export const CS_TEXT_MUTED_ACCENT = "text-[#f1c3c7]";

/** Borders & surfaces */
export const CS_BORDER_ACCENT = "border-[#b4141e]";
export const CS_BORDER_ACCENT_SOFT = "border-[#b4141e]/40";
export const CS_SURFACE_ACCENT = "border-[#b4141e]/35 bg-[#b4141e]/10";
export const CS_SURFACE_ACCENT_SOFT = "border-[#b4141e]/40 bg-[#b4141e]/10";

/** Outgoing message bubble (same red family, readable) */
export const CS_BUBBLE_OUTGOING =
  "rounded-[22px] rounded-br-md border border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82]";

/** Focus rings for inputs */
export const CS_FOCUS_RING =
  "focus:border-[#b4141e]/60 focus:outline-none focus:ring-2 focus:ring-[#b4141e]/20";

export function csPill(active: boolean, size: "sm" | "md" = "sm") {
  const base = size === "md" ? CS_PILL_MD : CS_PILL_SM;
  return `${base} ${active ? CS_PILL_ACTIVE : CS_PILL_INACTIVE}`;
}
