"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { copyTextToClipboard, formatMeetRouteCopy, shareMeetLink } from "@/lib/meets/share-meet";

type MeetDetailsOverflowMenuProps = {
  meetId: string;
  meetName: string;
  meetPoint: string;
  destination: string;
  hostProfileHref: string | null;
  canManage: boolean;
  isPrimaryHost: boolean;
  isRideLive: boolean;
  onReport: () => void;
  onEditMeet: () => void;
  onAddCoHost: () => void;
  onViewRiders: () => void;
  onEndMeet: () => void;
  onToast: (message: string) => void;
};

export function MeetDetailsOverflowMenu({
  meetId,
  meetName,
  meetPoint,
  destination,
  hostProfileHref,
  canManage,
  isPrimaryHost,
  isRideLive,
  onReport,
  onEditMeet,
  onAddCoHost,
  onViewRiders,
  onEndMeet,
  onToast,
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

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  async function handleShare() {
    try {
      const result = await shareMeetLink({ meetId, name: meetName, meetPoint });
      onToast(result.method === "share" ? "Meet shared." : "Meet link copied.");
    } catch {
      onToast("Could not share meet.");
    }
    setOpen(false);
  }

  async function handleCopyRoute() {
    try {
      await copyTextToClipboard(formatMeetRouteCopy(meetPoint, destination));
      onToast("Route copied.");
    } catch {
      onToast("Could not copy route.");
    }
    setOpen(false);
  }

  function runAction(action: () => void) {
    action();
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Meet options"
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/60 text-zinc-300 backdrop-blur-sm transition hover:text-white"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
          <circle cx="2.5" cy="7" r="1.2" />
          <circle cx="7" cy="7" r="1.2" />
          <circle cx="11.5" cy="7" r="1.2" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-10 z-20 min-w-[12rem] overflow-hidden rounded-xl border border-white/10 bg-[#0d080a] py-1 shadow-[0_18px_50px_rgba(0,0,0,0.75)]">
          <MenuButton onClick={() => void handleShare()}>Share Meet</MenuButton>
          <MenuButton onClick={() => void handleCopyRoute()}>Copy Route</MenuButton>
          {hostProfileHref ? (
            <MenuLink href={hostProfileHref}>View Host Profile</MenuLink>
          ) : null}
          <MenuButton onClick={() => runAction(onReport)}>Report Meet</MenuButton>

          {canManage ? (
            <>
              <div className="my-1 border-t border-white/8" />
              <MenuButton onClick={() => runAction(onEditMeet)}>Edit Meet</MenuButton>
              {isPrimaryHost ? (
                <MenuButton onClick={() => runAction(onAddCoHost)}>Add Co-Host</MenuButton>
              ) : null}
              <MenuButton onClick={() => runAction(onViewRiders)}>View Riders</MenuButton>
              {isRideLive ? (
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
      className={`block w-full px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.14em] transition hover:bg-white/[0.05] ${
        danger ? "text-[#e87a82]" : "text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block w-full px-4 py-2.5 text-left text-[11px] uppercase tracking-[0.14em] text-zinc-200 transition hover:bg-white/[0.05]"
    >
      {children}
    </Link>
  );
}
