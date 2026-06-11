"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BOTTOM_NAV_CLEARANCE } from "@/lib/crimson-accent";

type DashboardShellProps = {
  children: ReactNode;
  overlays?: ReactNode;
  visibleOffset: number;
  pullY: number;
  pullProgress: number;
  willRefresh: boolean;
  refreshing: boolean;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
};

export function DashboardShell({
  children,
  overlays,
  visibleOffset,
  pullY,
  pullProgress,
  willRefresh,
  refreshing,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onMouseDown,
  onMouseMove,
  onMouseUp,
}: DashboardShellProps) {
  return (
    <main
      className={`min-h-screen bg-[#050505] text-white ${BOTTOM_NAV_CLEARANCE}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-end justify-between px-5 pb-4 pt-[calc(1rem+env(safe-area-inset-top))]">
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#e87a82]">The Feed</p>
            <h1 className="font-serif text-2xl italic text-white">Crimson Society</h1>
          </div>
          <Link
            href="/create"
            className="rounded-full border border-[#b4141e] bg-[#b4141e]/20 px-4 py-2 text-xs uppercase tracking-[0.25em] text-[#e87a82] transition hover:bg-[#b4141e]/30"
          >
            + Post
          </Link>
        </div>
      </header>

      <div
        className="pointer-events-none absolute left-0 right-0 z-30 flex items-center justify-center"
        style={{
          height: `${visibleOffset}px`,
          opacity: visibleOffset > 6 ? 1 : 0,
          transition:
            refreshing || pullY === 0
              ? "height 0.3s ease, opacity 0.3s ease"
              : "none",
        }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full border bg-[#0a0a0b]/90 backdrop-blur ${
              willRefresh || refreshing
                ? "border-[#b4141e] text-[#e87a82] shadow-[0_0_18px_rgba(180,20,30,0.5)]"
                : "border-white/15 text-white/50"
            }`}
            style={{
              transform: refreshing ? "rotate(360deg)" : `rotate(${pullProgress * 360}deg)`,
              animation: refreshing ? "spin 0.7s linear infinite" : "none",
            }}
          >
            ↻
          </div>
          <p className="text-[9px] uppercase tracking-[0.35em] text-white/50">
            {refreshing ? "Refreshing" : willRefresh ? "Release" : "Pull"}
          </p>
        </div>
      </div>

      <div
        style={{
          transform: `translateY(${visibleOffset}px)`,
          transition: refreshing || pullY === 0 ? "transform 0.3s ease" : "none",
        }}
      >
        {children}
      </div>

      {overlays}
    </main>
  );
}
