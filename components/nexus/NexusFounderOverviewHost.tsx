"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NexusFounderDashboard } from "@/components/nexus/NexusFounderDashboard";
import { NexusOverviewDashboard } from "@/components/nexus/NexusOverviewDashboard";
import { useNexusScrollRestoration } from "@/hooks/nexus/useNexusPageState";
import { useHorizontalSwipe } from "@/hooks/useHorizontalSwipe";

export function NexusFounderOverviewHost() {
  const pathname = usePathname();
  const router = useRouter();
  const activeIndex = pathname === "/admin/nexus/overview" ? 1 : 0;
  const { ref: founderScrollRef, save: saveFounderScroll } =
    useNexusScrollRestoration("nexus:founder-dashboard");
  const { ref: overviewScrollRef, save: saveOverviewScroll } =
    useNexusScrollRestoration("nexus:overview");

  const setIndex = useCallback(
    (index: number) => {
      const next = index === 0 ? "/admin/nexus" : "/admin/nexus/overview";
      if (pathname !== next) {
        saveFounderScroll();
        saveOverviewScroll();
        router.push(next, { scroll: false });
      }
    },
    [pathname, router, saveFounderScroll, saveOverviewScroll],
  );

  const { viewportRef, swipeHandlers, translateX, isDragging, panelWidthPercent } =
    useHorizontalSwipe({
      activeIndex,
      panelCount: 2,
      enabled: true,
      onIndexChange: setIndex,
    });

  return (
    <div
      ref={viewportRef}
      className="flex min-h-0 min-w-0 flex-1 touch-pan-y overflow-hidden"
      {...swipeHandlers}
    >
      <div
        className={`flex h-full min-h-0 w-[200%] max-w-none ${isDragging ? "" : "transition-transform duration-300 ease-out"}`}
        style={{ transform: `translateX(${translateX}%)` }}
      >
        <div
          ref={founderScrollRef}
          className="h-full min-h-0 shrink-0 overflow-y-auto overscroll-contain pr-0"
          style={{ width: `${panelWidthPercent}%` }}
        >
          <NexusFounderDashboard />
        </div>
        <div
          ref={overviewScrollRef}
          className="h-full min-h-0 shrink-0 overflow-y-auto overscroll-contain"
          style={{ width: `${panelWidthPercent}%` }}
        >
          <NexusOverviewDashboard showFounderLink />
        </div>
      </div>
    </div>
  );
}
