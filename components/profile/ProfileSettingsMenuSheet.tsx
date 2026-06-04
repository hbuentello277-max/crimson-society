"use client";

import Link from "next/link";
import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import {
  clearProfileMenuScrollTop,
  readProfileMenuScrollTop,
  saveProfileMenuScrollTop,
} from "@/lib/navigation/profile-menu-scroll";
import { IconAdmin } from "@/components/profile/ProfileIcons";
import {
  IconChevronRight,
  IconMenuBell,
  IconMenuBlackcard,
  IconMenuCredits,
  IconMenuDocument,
  IconMenuInfo,
  IconMenuLocation,
  IconMenuLogOut,
  IconMenuPrivacy,
  IconMenuReferrals,
  IconMenuRewards,
  IconMenuSafety,
  IconMenuSettings,
  IconMenuSupport,
} from "@/components/profile/ProfileMenuIcons";
import {
  deletionStatusLabel,
  deletionStatusUserMessage,
  type AccountDeletionRequestRow,
} from "@/lib/account-deletion";
import { hrefWithProfileMenuFrom } from "@/lib/navigation/profile-menu-return";

/** Compact gray/black row — matches pre–large-menu profile sheet */
const MENU_ROW =
  "flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/[0.025] px-3.5 py-2.5 text-sm text-zinc-200 transition hover:border-white/20 hover:bg-white/[0.04]";

const MENU_ROW_COMPACT =
  "flex w-full items-center justify-between gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-2 text-xs uppercase tracking-[0.14em] text-zinc-500 transition hover:border-white/15 hover:text-zinc-300";

const MENU_ROW_LEGAL =
  "flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.14em] text-zinc-400 transition hover:border-white/15 hover:text-zinc-300";

const DESTRUCTIVE_BTN =
  "block w-full rounded-xl border border-[#b4141e]/50 bg-[#b4141e]/12 px-3 py-2.5 text-left text-xs uppercase tracking-[0.14em] text-[#e87a82] transition hover:border-[#b4141e]/70 hover:bg-[#b4141e]/20 disabled:cursor-not-allowed disabled:opacity-60";

type MenuLinkItem = {
  href: string;
  label: string;
  icon?: ReactNode;
};

type Props = {
  open: boolean;
  isAdmin: boolean;
  deletionRequest: AccountDeletionRequestRow | null;
  deletionRequestLoading: boolean;
  deleteRequesting: boolean;
  deleteRequestStatus: string | null;
  deletionDisabled: boolean;
  showManageDeletion: boolean;
  onClose: () => void;
  /** Hide sheet when navigating to a subpage without clearing menu history state. */
  onNavigate: () => void;
  onSignOut: () => void;
  onRequestDeletion: () => void;
};

function RowChevron() {
  return <IconChevronRight className="h-3 w-3 shrink-0 text-zinc-600" />;
}

function RowLabel({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {icon ? <span className="shrink-0 text-zinc-500 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span> : null}
      <span className="truncate">{label}</span>
    </span>
  );
}

function MenuLinkRow({
  item,
  className,
  onNavigate,
  onBeforeNavigate,
}: {
  item: MenuLinkItem;
  className: string;
  onNavigate: () => void;
  onBeforeNavigate: () => void;
}) {
  return (
    <Link
      href={hrefWithProfileMenuFrom(item.href)}
      prefetch
      onClick={() => {
        onBeforeNavigate();
        onNavigate();
      }}
      className={className}
    >
      <RowLabel icon={item.icon} label={item.label} />
      <RowChevron />
    </Link>
  );
}

export function ProfileSettingsMenuSheet({
  open,
  isAdmin,
  deletionRequest,
  deletionRequestLoading,
  deleteRequesting,
  deleteRequestStatus,
  deletionDisabled,
  showManageDeletion,
  onClose,
  onNavigate,
  onSignOut,
  onRequestDeletion,
}: Props) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const persistScrollPosition = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    saveProfileMenuScrollTop(el.scrollTop);
  }, []);

  const handleClose = useCallback(() => {
    clearProfileMenuScrollTop();
    onClose();
  }, [onClose]);

  useLayoutEffect(() => {
    if (!open) return;

    const saved = readProfileMenuScrollTop();
    if (saved == null) return;

    const el = scrollContainerRef.current;
    if (!el) return;

    const applyScroll = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = saved;
      }
    };

    applyScroll();
    requestAnimationFrame(() => {
      applyScroll();
      requestAnimationFrame(applyScroll);
    });
  }, [open]);

  if (!open) return null;

  const mainItems: MenuLinkItem[] = [
    { href: "/profile/edit", label: "Settings", icon: <IconMenuSettings /> },
    { href: "/inbox?tab=notifications", label: "Notifications", icon: <IconMenuBell /> },
    { href: "/privacy", label: "Privacy", icon: <IconMenuPrivacy /> },
    { href: "/rides/track?live=1", label: "Location Sharing", icon: <IconMenuLocation /> },
    { href: "/blackcard", label: "Blackcard", icon: <IconMenuBlackcard /> },
    { href: "/safety", label: "Safety", icon: <IconMenuSafety /> },
    { href: "/support", label: "Support", icon: <IconMenuSupport /> },
  ];

  const shopItems: MenuLinkItem[] = [
    { href: "/shop", label: "Shop", icon: <IconMenuRewards /> },
    { href: "/profile/orders", label: "Orders", icon: <IconMenuRewards /> },
  ];

  const creditsItems: MenuLinkItem[] = [
    { href: "/profile/credits/history", label: "Credits History", icon: <IconMenuCredits /> },
    { href: "/profile/credits/referrals", label: "Referrals", icon: <IconMenuReferrals /> },
    { href: "/profile/credits/how-it-works", label: "How It Works", icon: <IconMenuInfo /> },
  ];

  const legalItems: MenuLinkItem[] = [
    { href: "/community-guidelines", label: "Community Guidelines", icon: <IconMenuDocument /> },
    { href: "/terms", label: "Terms of Service", icon: <IconMenuDocument /> },
    { href: "/privacy", label: "Privacy Policy", icon: <IconMenuDocument /> },
    { href: "/safety", label: "Safety Policy", icon: <IconMenuSafety /> },
  ];

  const deletionPendingLabel =
    deletionRequest && deletionDisabled ? "Deletion Request Pending" : "Request Account Deletion";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close profile menu"
        className="absolute inset-0 cursor-default"
        onClick={handleClose}
      />
      <section className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#080809] shadow-[0_30px_90px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Profile Menu</p>
            <h2 className="mt-0.5 font-serif text-xl text-white">Settings</h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-lg text-zinc-300 transition hover:border-white/25 hover:text-white"
            aria-label="Close profile menu"
          >
            ×
          </button>
        </div>

        <div ref={scrollContainerRef} className="max-h-[78dvh] overflow-y-auto px-3 py-3">
          <div className="grid gap-1.5">
            {mainItems.map((item) => (
              <MenuLinkRow
                key={item.label}
                item={item}
                className={MENU_ROW}
                onNavigate={onNavigate}
                onBeforeNavigate={persistScrollPosition}
              />
            ))}
            {isAdmin && (
              <MenuLinkRow
                item={{
                  href: "/admin",
                  label: "Admin Dashboard",
                  icon: <IconAdmin className="h-3.5 w-3.5" />,
                }}
                className={MENU_ROW}
                onNavigate={onNavigate}
                onBeforeNavigate={persistScrollPosition}
              />
            )}
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">Shop</p>
            <div className="mt-2 grid gap-1.5">
              {shopItems.map((item) => (
                <MenuLinkRow
                  key={item.label}
                  item={item}
                  className={MENU_ROW_COMPACT}
                  onNavigate={onNavigate}
                  onBeforeNavigate={persistScrollPosition}
                />
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">Crimson Credits</p>
            <div className="mt-2 grid gap-1.5">
              {creditsItems.map((item) => (
                <MenuLinkRow
                  key={item.label}
                  item={item}
                  className={MENU_ROW_COMPACT}
                  onNavigate={onNavigate}
                  onBeforeNavigate={persistScrollPosition}
                />
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">Legal</p>
            <div className="mt-2 grid gap-1.5">
              {legalItems.map((item) => (
                <MenuLinkRow
                  key={`${item.href}-${item.label}`}
                  item={item}
                  className={MENU_ROW_LEGAL}
                  onNavigate={onNavigate}
                  onBeforeNavigate={persistScrollPosition}
                />
              ))}
            </div>

            <div className="mt-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Account deletion</p>
              <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                You will be signed out immediately. Your account enters deletion_pending until an admin
                approves. You can sign back in only to check status or cancel while pending.
              </p>
              <Link
                href={hrefWithProfileMenuFrom("/account-deletion")}
                prefetch
                onClick={() => {
                  persistScrollPosition();
                  onNavigate();
                }}
                className="mt-1.5 inline-block text-[10px] uppercase tracking-[0.16em] text-zinc-400 hover:text-[#e87a82]"
              >
                How account deletion works
              </Link>
              {deletionRequestLoading ? (
                <p className="mt-2 text-xs leading-5 text-zinc-600">Loading request status…</p>
              ) : deletionRequest ? (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                    Status: {deletionStatusLabel(deletionRequest.status)}
                  </p>
                  <p className="text-xs leading-5 text-zinc-500">
                    {deletionStatusUserMessage(deletionRequest)}
                  </p>
                </div>
              ) : null}
            </div>

            {showManageDeletion && (
              <MenuLinkRow
                item={{
                  href: hrefWithProfileMenuFrom("/deletion-pending"),
                  label: "Manage deletion status",
                  icon: <IconMenuDocument />,
                }}
                className={`${MENU_ROW_LEGAL} mt-1.5`}
                onNavigate={onNavigate}
                onBeforeNavigate={persistScrollPosition}
              />
            )}
          </div>

          <div className="mt-3 grid gap-1.5 border-t border-white/10 pt-3">
            <button type="button" onClick={onSignOut} className={`${MENU_ROW} text-left`}>
              <RowLabel icon={<IconMenuLogOut />} label="Log Out" />
              <RowChevron />
            </button>

            <button
              type="button"
              onClick={onRequestDeletion}
              disabled={deletionDisabled || deleteRequesting}
              className={DESTRUCTIVE_BTN}
            >
              {deleteRequesting ? "Submitting…" : deletionPendingLabel}
            </button>

            {deleteRequestStatus && (
              <p className="px-1 text-xs leading-5 text-zinc-500">{deleteRequestStatus}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
