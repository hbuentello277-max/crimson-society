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

/** Icon-only circular actions (send arrow, toolbar, etc.) */
export const CS_ICON_BTN_ACTIVE =
  "flex items-center justify-center rounded-full border border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82] transition hover:bg-[#b4141e]/30";

export const CS_ICON_BTN_DISABLED =
  "flex items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-500";

/** DM send — same tokens as Connect ALL pill */
export const CS_SEND_BTN =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82] transition hover:bg-[#b4141e]/30 disabled:pointer-events-none disabled:opacity-40";

export const CS_SEND_BTN_DISABLED =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-500";

/** DM composer toolbar icon buttons */
export const CS_TOOLBAR_BTN =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition";

export const CS_TOOLBAR_BTN_ACTIVE =
  `${CS_TOOLBAR_BTN} border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82] hover:bg-[#b4141e]/30`;

export const CS_TOOLBAR_BTN_INACTIVE =
  `${CS_TOOLBAR_BTN} border-transparent text-zinc-500 hover:border-white/20 hover:bg-white/[0.04] hover:text-zinc-300`;

export const CS_TOOLBAR_BTN_DISABLED =
  `${CS_TOOLBAR_BTN} border-transparent text-zinc-600 opacity-45 cursor-not-allowed`;

/** Compact profile / card actions */
export const CS_BTN_SECONDARY =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-[10px] uppercase tracking-[0.14em] text-zinc-200 transition hover:border-white/30 hover:text-zinc-300";

export const CS_BTN_PRIMARY_COMPACT =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-[#b4141e] bg-[#b4141e]/20 px-2.5 text-[10px] uppercase tracking-[0.14em] text-[#e87a82] transition hover:bg-[#b4141e]/30";

/** Profile header actions — rounded-full pill family */
export const CS_PROFILE_BTN_PRIMARY = `${CS_CTA_PRIMARY} inline-flex min-h-8 items-center justify-center gap-1.5 px-3 py-2 text-[10px] uppercase tracking-[0.14em]`;

export const CS_PROFILE_BTN_SOFT =
  "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full border border-[#b4141e]/50 bg-[#b4141e]/12 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-[#e87a82] transition hover:bg-[#b4141e]/22 hover:border-[#b4141e]/70";

/** Small overlay chips (map, feed) */
export const CS_CHIP_PILL = `${CS_PILL_SM} ${CS_PILL_ACTIVE}`;

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

/** Connect / list avatar rings and letter fallbacks */
export const CS_AVATAR_RING =
  "overflow-hidden rounded-full border border-[#b4141e]/50 bg-[#0a0405] shadow-[0_0_20px_-8px_rgba(180,20,30,0.45)]";

export const CS_AVATAR_FALLBACK =
  "flex h-full w-full items-center justify-center bg-[#b4141e]/20 font-serif italic text-[#e87a82]";

/** Dock controls tight to home indicator — minimal gutter, still clears indicator on notch iPhones. */
export const MOBILE_BOTTOM_SAFE_INSET = "max(0px, calc(env(safe-area-inset-bottom) - 18px))";

/** Shop header bag control — Connect ALL pill language */
export const CS_SHOP_BAG_BTN = `${CS_CTA_PRIMARY} relative flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-[0.25em]`;

export const CS_SHOP_BAG_COUNT = `${CS_BADGE} absolute -right-1 -top-1 h-4 w-4 min-w-4 px-0 text-[9px]`;

/** Meets host CTA */
export const CS_HOST_MEET_BTN = CS_CTA_PRIMARY_SM;
