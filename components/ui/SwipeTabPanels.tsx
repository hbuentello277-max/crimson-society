"use client";

import type { ReactNode } from "react";
import { useHorizontalSwipe } from "@/hooks/useHorizontalSwipe";

type SwipeTabPanelsProps = {
  activeIndex: number;
  onIndexChange: (index: number) => void;
  children: ReactNode[];
  className?: string;
};

export function SwipeTabPanels({
  activeIndex,
  onIndexChange,
  children,
  className = "",
}: SwipeTabPanelsProps) {
  const panelCount = children.length;
  const { viewportRef, swipeHandlers, translateX, isDragging, panelWidthPercent } =
    useHorizontalSwipe({
      activeIndex,
      panelCount,
      onIndexChange,
    });

  return (
    <div
      ref={viewportRef}
      className={`overflow-hidden touch-pan-y ${className}`}
      {...swipeHandlers}
    >
      <div
        className={`flex ${isDragging ? "" : "transition-transform duration-300 ease-out"}`}
        style={{
          width: `${panelCount * 100}%`,
          transform: `translateX(${translateX}%)`,
        }}
      >
        {children.map((panel, index) => (
          <div
            key={index}
            className="shrink-0 overflow-x-hidden"
            style={{ width: `${panelWidthPercent}%` }}
            aria-hidden={index !== activeIndex}
          >
            {panel}
          </div>
        ))}
      </div>
    </div>
  );
}
