"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NexusFounderDashboard } from "@/components/nexus/NexusFounderDashboard";
import { NexusOverviewDashboard } from "@/components/nexus/NexusOverviewDashboard";
import { useNexusScrollRestoration } from "@/hooks/nexus/useNexusPageState";
import { useHorizontalSwipe } from "@/hooks/useHorizontalSwipe";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

export function NexusFounderOverviewHost() {
  const pathname = usePathname();
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();
  const activeIndex = pathname === "/admin/nexus/overview" ? 1 : 0;
  const [overviewMounted, setOverviewMounted] = useState(activeIndex === 1);
  const { ref: founderScrollRef, save: saveFounderScroll } =
    useNexusScrollRestoration("nexus:founder-dashboard");
  const { ref: overviewScrollRef, save: saveOverviewScroll } =
    useNexusScrollRestoration("nexus:overview");

  useEffect(() => {
    if (activeIndex === 1) {
      setOverviewMounted(true);
    }
  }, [activeIndex]);

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

  const {
    viewportRef,
    swipeHandlers,
    translatePx,
    panelWidth,
    trackWidthPx,
    isDragging,
    viewportReady,
  } = useHorizontalSwipe({
    activeIndex,
    panelCount: 2,
    enabled: true,
    onIndexChange: setIndex,
  });

  const panelStyle =
    viewportReady && panelWidth > 0
      ? { width: panelWidth, minWidth: panelWidth, maxWidth: panelWidth }
      : { width: "100%", minWidth: "100%", maxWidth: "100%" };

  return (
    <div
      ref={viewportRef}
      className="flex min-h-0 min-w-0 flex-1 touch-pan-y overflow-hidden"
      {...swipeHandlers}
    >
      <div
        className={`flex h-full min-h-0 shrink-0 ${
          isDragging || prefersReducedMotion ? "" : "transition-transform duration-300 ease-out"
        }`}
        style={{
          width: trackWidthPx > 0 ? trackWidthPx : "100%",
          transform: viewportReady ? `translateX(${translatePx}px)` : undefined,
        }}
      >
        <div
          ref={founderScrollRef}
          className="h-full min-h-0 shrink-0 overflow-y-auto overscroll-contain"
          style={panelStyle}
        >
          <NexusFounderDashboard />
        </div>
        <div
          ref={overviewScrollRef}
          className="h-full min-h-0 shrink-0 overflow-y-auto overscroll-contain"
          style={panelStyle}
        >
          {overviewMounted ? <NexusOverviewDashboard showFounderLink /> : null}
        </div>
      </div>
    </div>
  );
}
