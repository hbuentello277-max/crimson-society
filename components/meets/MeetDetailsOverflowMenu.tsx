"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type MeetDetailsOverflowMenuProps = {
  canManage: boolean;
  isPrimaryHost: boolean;
  isRideLive: boolean;
  isCanceled: boolean;
  hostProfileHref: string | null;
  endMeetInFooter: boolean;
  canAssignCoHost: boolean;
  onReport: () => void;
  onShare: () => void;
  onCopyRoute: () => void;
  onEditMeet?: () => void;
  onAddCoHost?: () => void;
  onViewRiders?: () => void;
  onCancelMeet?: () => void;
  onEndMeet?: () => void;
};

function MenuButton({
  children,
  onClick,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.14em] transition ${
        danger
          ? "text-[#e87a82] hover:bg-[#b4141e]/10"
          : "text-zinc-200 hover:bg-white/[0.04]"
      }`}
    >
      {children}
    </button>
  );
}

function MenuLink({ href, children, onNavigate }: { href: string; children: React.ReactNode; onNavigate: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-zinc-200 transition hover:bg-white/[0.04]"
    >
      {children}
    </Link>
  );
}

export function MeetDetailsOverflowMenu({
  canManage,
  isPrimaryHost,
  isRideLive,
  isCanceled,
  hostProfileHref,
  endMeetInFooter,
  canAssignCoHost,
  onReport,
  onShare,
  onCopyRoute,
  onEditMeet,
  onAddCoHost,
  onViewRiders,
  onCancelMeet,
  onEndMeet,
}: MeetDetailsOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function runAction(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Meet options"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/60 text-zinc-300 backdrop-blur-sm transition hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden>
          <circle cx="2.5" cy="7" r="1.2" />
          <circle cx="7" cy="7" r="1.2" />
          <circle cx="11.5" cy="7" r="1.2" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-20 min-w-[12rem] overflow-hidden rounded-xl border border-white/10 bg-[#0d080a] py-1 shadow-[0_18px_50px_rgba(0,0,0,0.75)]">
          <MenuButton onClick={() => void runAction(onShare)}>Share Meet</MenuButton>
          <MenuButton onClick={() => void runAction(onCopyRoute)}>Copy Route</MenuButton>
          {hostProfileHref ? (
            <MenuLink href={hostProfileHref} onNavigate={() => setOpen(false)}>
              View Host Profile
            </MenuLink>
          ) : null}
          <MenuButton onClick={() => runAction(onReport)}>Report Meet</MenuButton>

          {canManage && !isCanceled ? (
            <>
              <div className="my-1 border-t border-white/8" />
              {onEditMeet ? (
                <MenuButton onClick={() => runAction(onEditMeet)}>Edit Meet</MenuButton>
              ) : null}
              {isPrimaryHost && onAddCoHost && canAssignCoHost ? (
                <MenuButton onClick={() => runAction(onAddCoHost)}>Add Co-Host</MenuButton>
              ) : null}
              {onViewRiders ? (
                <MenuButton onClick={() => runAction(onViewRiders)}>View Riders</MenuButton>
              ) : null}
              {isPrimaryHost && onCancelMeet ? (
                <MenuButton onClick={() => runAction(onCancelMeet)} danger>
                  Cancel Meet
                </MenuButton>
              ) : null}
              {isRideLive && onEndMeet && !endMeetInFooter ? (
                <MenuButton onClick={() => runAction(onEndMeet)} danger>
                  End Meet
                </MenuButton>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
