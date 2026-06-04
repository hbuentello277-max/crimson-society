"use client";

import Link from "next/link";
import type { ReactNode } from "react";
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

const MENU_ROW =
  "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-zinc-200 transition hover:bg-white/[0.04] active:bg-white/[0.06]";

const MENU_SECTION = "rounded-2xl border border-white/10 bg-black";

const MENU_ICON_WRAP =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-zinc-400";

const DESTRUCTIVE_BTN =
  "flex w-full items-center justify-center rounded-xl border border-[#b4141e]/55 bg-[#b4141e]/12 px-4 py-3.5 text-sm font-medium text-[#e87a82] transition hover:border-[#b4141e]/75 hover:bg-[#b4141e]/20 disabled:cursor-not-allowed disabled:opacity-60";

type MenuLinkItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

type Props = {
  open: boolean;
  isAdmin: boolean;
  deletionRequest: AccountDeletionRequestRow | null;
  deletionRequestLoading: boolean;
  deleteRequesting: boolean;
  profileStatus: string | null;
  deleteRequestStatus: string | null;
  deletionDisabled: boolean;
  showManageDeletion: boolean;
  onClose: () => void;
  onSignOut: () => void;
  onRequestDeletion: () => void;
};

function MenuLinkRow({
  item,
  onNavigate,
}: {
  item: MenuLinkItem;
  onNavigate: () => void;
}) {
  return (
    <Link href={item.href} prefetch onClick={onNavigate} className={MENU_ROW}>
      <span className={MENU_ICON_WRAP}>{item.icon}</span>
      <span className="min-w-0 flex-1">{item.label}</span>
      <IconChevronRight className="text-zinc-600" />
    </Link>
  );
}

function MenuButtonRow({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${MENU_ROW} disabled:opacity-60`}>
      <span className={MENU_ICON_WRAP}>{icon}</span>
      <span className="min-w-0 flex-1">{label}</span>
      <IconChevronRight className="text-zinc-600" />
    </button>
  );
}

export function ProfileSettingsMenuSheet({
  open,
  isAdmin,
  deletionRequest,
  deletionRequestLoading,
  deleteRequesting,
  profileStatus,
  deleteRequestStatus,
  deletionDisabled,
  showManageDeletion,
  onClose,
  onSignOut,
  onRequestDeletion,
}: Props) {
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

  const creditsItems: MenuLinkItem[] = [
    { href: "/profile/credits/history", label: "Credits History", icon: <IconMenuCredits /> },
    { href: "/profile/credits/referrals", label: "Referrals", icon: <IconMenuReferrals /> },
    { href: "/profile/credits/rewards", label: "Rewards", icon: <IconMenuRewards /> },
    { href: "/profile/credits/how-it-works", label: "How It Works", icon: <IconMenuInfo /> },
  ];

  const legalItems: MenuLinkItem[] = [
    { href: "/community-guidelines", label: "Community Guidelines", icon: <IconMenuDocument /> },
    { href: "/terms", label: "Terms of Service", icon: <IconMenuDocument /> },
    { href: "/privacy", label: "Privacy Policy", icon: <IconMenuDocument /> },
    { href: "/safety", label: "Safety Policy", icon: <IconMenuSafety /> },
  ];

  const deletionPendingLabel =
    deletionRequest && deletionRequest.status
      ? "Deletion Request Pending"
      : "Request Account Deletion";

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/65 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close profile menu"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-[#050505] shadow-[0_30px_90px_rgba(0,0,0,0.7)]">
        <div className="flex items-center justify-between border-b border-[#8f0f18]/80 bg-gradient-to-r from-[#6b0c12] via-[#b4141e] to-[#6b0c12] px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/70">Profile Menu</p>
            <h2 className="mt-1 font-serif text-2xl text-white">Settings</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/20 text-xl text-white transition hover:bg-black/35"
            aria-label="Close profile menu"
          >
            ×
          </button>
        </div>

        <div className="max-h-[78dvh] overflow-y-auto bg-black px-3 py-3">
          <div className={`${MENU_SECTION} p-1`}>
            {mainItems.map((item) => (
              <MenuLinkRow key={item.label} item={item} onNavigate={onClose} />
            ))}
            {isAdmin && (
              <MenuLinkRow
                item={{
                  href: "/admin",
                  label: "Admin Dashboard",
                  icon: <IconAdmin className="h-5 w-5" />,
                }}
                onNavigate={onClose}
              />
            )}
          </div>

          <div className={`mt-3 ${MENU_SECTION} p-3`}>
            <p className="px-2 text-[10px] uppercase tracking-[0.26em] text-zinc-500">Crimson Credits</p>
            <div className="mt-1 divide-y divide-white/[0.06]">
              {creditsItems.map((item) => (
                <MenuLinkRow key={item.label} item={item} onNavigate={onClose} />
              ))}
            </div>
          </div>

          <div className={`mt-3 ${MENU_SECTION} p-3`}>
            <p className="px-2 text-[10px] uppercase tracking-[0.26em] text-zinc-500">Legal</p>
            <div className="mt-1 divide-y divide-white/[0.06]">
              {legalItems.map((item) => (
                <MenuLinkRow key={`${item.href}-${item.label}`} item={item} onNavigate={onClose} />
              ))}
            </div>
          </div>

          <div className="mt-4 border-t border-white/10 pt-3">
            <div className={`${MENU_SECTION} p-1`}>
              <MenuButtonRow
                label="Log Out"
                icon={<IconMenuLogOut />}
                onClick={onSignOut}
              />
            </div>

            <div className="mt-3 rounded-2xl border border-white/10 bg-black px-3 py-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Account deletion</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                You will be signed out immediately. Your account enters deletion_pending until an admin
                approves. You can sign back in only to check status or cancel while pending.
              </p>
              <Link
                href="/account-deletion"
                prefetch
                onClick={onClose}
                className="mt-2 inline-block text-[10px] uppercase tracking-[0.16em] text-zinc-400 hover:text-[#e87a82]"
              >
                How account deletion works
              </Link>
              {deletionRequestLoading ? (
                <p className="mt-3 text-xs leading-5 text-zinc-600">Loading request status…</p>
              ) : deletionRequest ? (
                <div className="mt-3 space-y-2">
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
              <div className={`mt-2 ${MENU_SECTION} p-1`}>
                <MenuLinkRow
                  item={{
                    href: "/deletion-pending",
                    label: "Manage deletion status",
                    icon: <IconMenuDocument />,
                  }}
                  onNavigate={onClose}
                />
              </div>
            )}

            <button
              type="button"
              onClick={onRequestDeletion}
              disabled={deletionDisabled || deleteRequesting}
              className={`mt-3 ${DESTRUCTIVE_BTN}`}
            >
              {deleteRequesting
                ? "Submitting…"
                : deletionDisabled && deletionPendingLabel === "Deletion Request Pending"
                  ? deletionPendingLabel
                  : "Request Account Deletion"}
            </button>

            {deleteRequestStatus && (
              <p className="mt-2 px-1 text-xs leading-5 text-zinc-500">{deleteRequestStatus}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
