"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ThreadOverflowMenuProps = {
  profileHref?: string | null;
  onReportConversation?: () => void;
};

export function ThreadOverflowMenu({ profileHref, onReportConversation }: ThreadOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-xl leading-none text-white/70 hover:text-white"
        aria-label="Conversation options"
        aria-expanded={open}
      >
        ⋯
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl border border-white/10 bg-[#121212] shadow-2xl">
          {profileHref && (
            <Link
              href={profileHref}
              onClick={() => setOpen(false)}
              className="block w-full px-4 py-3 text-left text-sm text-zinc-200 hover:bg-white/[0.05]"
            >
              View profile
            </Link>
          )}
          {onReportConversation && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onReportConversation();
              }}
              className="w-full px-4 py-3 text-left text-sm text-zinc-200 hover:bg-white/[0.05]"
            >
              Report
            </button>
          )}
          <p className="border-t border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
            Coming soon: media, reactions, receipts
          </p>
        </div>
      )}
    </div>
  );
}
