"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { NEXUS_SYSTEMS_DIRECTORY } from "@/lib/nexus/systems-directory";

export function NexusSystemsDirectory({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="Close NEXUS Systems"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="nexus-systems-title"
        className="relative z-10 flex max-h-[min(88dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#b4141e]/30 bg-[#060405] shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#b4141e]/20 px-4 py-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">Directory</p>
            <h2 id="nexus-systems-title" className="font-serif text-xl text-white">
              NEXUS Systems
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-zinc-400 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-5">
            {NEXUS_SYSTEMS_DIRECTORY.map((category) => (
              <section key={category.id}>
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-[#e87a82]">
                  {category.label}
                </h3>
                <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {category.items.map((item, index) => (
                    <li key={`${category.id}-${item.href}-${index}`}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className="flex min-h-10 items-center rounded-lg border border-white/8 bg-black/30 px-3 py-2 text-sm text-zinc-200 transition hover:border-[#b4141e]/40 hover:bg-[#b4141e]/10 hover:text-white"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
